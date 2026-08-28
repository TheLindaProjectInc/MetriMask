/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { networks, Network, Insight } from 'metrixjs-wallet';

import MetriMaskController from '.';
import IController from './iController';
import { MESSAGE_TYPE, STORAGE, NETWORK_NAMES } from '../../constants';
import QryNetwork from '../../models/QryNetwork';

const DEFAULT_NETWORK_URLS: Record<string, string> = {
  [NETWORK_NAMES.MAINNET]: 'https://explorer.metrixcoin.com/',
  [NETWORK_NAMES.TESTNET]: 'https://testnet-explorer.metrixcoin.com/',
  [NETWORK_NAMES.REGTEST]: 'http://localhost:3001/explorer/',
};

const normalizeBaseUrl = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

// Matches metrixjs-wallet's own Wallet.js `defaultTxFeePerByte` fallback ("10 MRX/KB").
// Bitcoin-protocol fee rates are denominated per 1000 bytes (decimal kB), not 1024 (KiB).
const DEFAULT_FEE_RATE_PER_BYTE = Math.ceil((10 * 1e8) / 1000);

// Absorbs natural per-transaction size variance (ECDSA signature DER encoding varies by a
// few bytes each time a transaction is signed) and general estimate uncertainty, so a
// transaction doesn't land just under the network's minimum relay fee and get rejected.
const FEE_RATE_SAFETY_MARGIN = 1.05;

const FEE_SPEED_MULTIPLIERS = {
  // Kept close to 1x (rather than a steep discount) so the safety-margined "slow" tier
  // still can't undershoot the network's actual minimum relay fee.
  slow: 0.9,
  normal: 1,
  fast: 1.5,
};

export interface IFeeRateTiers {
  slow: number;
  normal: number;
  fast: number;
}

export default class NetworkController extends IController {
  public static NETWORKS: QryNetwork[] = [
    new QryNetwork(NETWORK_NAMES.MAINNET, networks.mainnet, DEFAULT_NETWORK_URLS[NETWORK_NAMES.MAINNET]),
    new QryNetwork(NETWORK_NAMES.TESTNET, networks.testnet, DEFAULT_NETWORK_URLS[NETWORK_NAMES.TESTNET]),
    new QryNetwork(NETWORK_NAMES.REGTEST, networks.regtest, DEFAULT_NETWORK_URLS[NETWORK_NAMES.REGTEST]),
  ];

  public get isMainNet(): boolean {
    return this.networkIndex === 0;
  }
  public get network(): Network {
    return NetworkController.NETWORKS[this.networkIndex].network;
  }
  public get explorerUrl(): string {
    return NetworkController.NETWORKS[this.networkIndex].explorerUrl + 'tx';
  }
  public get tokenUrl(): string {
    return NetworkController.NETWORKS[this.networkIndex].explorerUrl + 'mrc20';
  }
  public get mrc721Url(): string {
    return NetworkController.NETWORKS[this.networkIndex].explorerUrl + 'mrc721';
  }
  public get networkName(): string {
    return NetworkController.NETWORKS[this.networkIndex].name;
  }
  /*
  * The RegTest network is only relevant to developers/testers, so it's hidden from the
  * network switcher entirely unless explicitly enabled in Settings.
  */
  public get visibleNetworks(): QryNetwork[] {
    return this.regtestEnabled ? NetworkController.NETWORKS : NetworkController.NETWORKS.slice(0, 2);
  }

  private networkIndex = 0;
  private regtestEnabled = false;
  private endpointOverrides: Record<string, string> = {};

  constructor(main: MetriMaskController) {
    super('network', main);

    chrome.runtime.onMessage.addListener(this.handleMessage);
    chrome.storage.local.get(
      [STORAGE.NETWORK_INDEX, STORAGE.REGTEST_ENABLED, STORAGE.NETWORK_ENDPOINT_OVERRIDES],
      ({ networkIndex, regtestEnabled, networkEndpointOverrides }: any) => {
        if (regtestEnabled !== undefined) {
          this.regtestEnabled = regtestEnabled;
        }

        if (networkEndpointOverrides !== undefined) {
          this.endpointOverrides = networkEndpointOverrides;
          Object.keys(this.endpointOverrides).forEach(
            (name) => this.applyOverride(name, this.endpointOverrides[name])
          );
        }

        if (networkIndex !== undefined) {
          // Guard against a persisted RegTest selection from before it was disabled.
          this.networkIndex = (!this.regtestEnabled && networkIndex === 2) ? 0 : networkIndex;
          chrome.runtime.sendMessage({ type: MESSAGE_TYPE.CHANGE_NETWORK_SUCCESS, networkIndex: this.networkIndex });
        }

        this.initFinished();
      }
    );
  }

  /*
  * Changes the networkIndex and logs out of the loggedInAccount.
  * @param networkIndex The index of the network to change to.
  */
  public changeNetwork = (networkIndex: number) => {
    if (this.networkIndex !== networkIndex) {
      this.networkIndex = networkIndex;
      chrome.storage.local.set({
        [STORAGE.NETWORK_INDEX]: networkIndex,
      }, () => console.log('networkIndex changed', networkIndex));

      chrome.runtime.sendMessage({ type: MESSAGE_TYPE.CHANGE_NETWORK_SUCCESS, networkIndex });
      this.main.account.logoutNetwork();
    }
  };

  /*
  * Sets (or, with an empty url, clears) a custom RPC/explorer endpoint for a network.
  * Reconnects immediately only if the edited network is the one currently active.
  */
  public saveEndpointOverride = (networkName: string, url: string) => {
    const index = NetworkController.NETWORKS.findIndex((n) => n.name === networkName);
    if (index === -1) {
      return;
    }

    if (url) {
      const normalized = normalizeBaseUrl(url);
      this.endpointOverrides[networkName] = normalized;
      this.applyOverride(networkName, normalized);
    } else {
      delete this.endpointOverrides[networkName];
      this.clearOverride(networkName);
    }

    chrome.storage.local.set({ [STORAGE.NETWORK_ENDPOINT_OVERRIDES]: this.endpointOverrides });

    if (index === this.networkIndex) {
      this.main.account.logoutNetwork();
    }
  };

  /*
  * Derives Slow/Normal/Fast network fee-rate tiers (satoshi/byte) from the current network's
  * live fee estimate, falling back to the library's own "10 MRX/KB" default when the API
  * doesn't return a usable estimate (matches metrixjs-wallet's own internal fallback).
  */
  public getFeeRateTiers = async (): Promise<IFeeRateTiers> => {
    let baseRate = DEFAULT_FEE_RATE_PER_BYTE;

    try {
      const networkInfo = NetworkController.NETWORKS[this.networkIndex].network.info;
      const estimated = await Insight.forNetwork(networkInfo).estimateFeePerByte();
      if (estimated && estimated > 0) {
        baseRate = estimated;
      }
    } catch (err) {
      console.error('getFeeRateTiers: falling back to default fee rate', err);
    }

    baseRate = Math.ceil(baseRate * FEE_RATE_SAFETY_MARGIN);

    return {
      slow: Math.ceil(baseRate * FEE_SPEED_MULTIPLIERS.slow),
      normal: Math.ceil(baseRate * FEE_SPEED_MULTIPLIERS.normal),
      fast: Math.ceil(baseRate * FEE_SPEED_MULTIPLIERS.fast),
    };
  };

  public saveRegtestEnabled = (enabled: boolean) => {
    this.regtestEnabled = enabled;
    chrome.storage.local.set({ [STORAGE.REGTEST_ENABLED]: enabled });

    if (!enabled && this.networkIndex === 2) {
      this.changeNetwork(0);
    }
  };

  private applyOverride = (networkName: string, url: string) => {
    const index = NetworkController.NETWORKS.findIndex((n) => n.name === networkName);
    if (index === -1) {
      return;
    }
    NetworkController.NETWORKS[index].explorerUrl = url;
    Insight.setBaseURLOverride(NetworkController.NETWORKS[index].network.info.name, url + 'api');
  };

  private clearOverride = (networkName: string) => {
    const index = NetworkController.NETWORKS.findIndex((n) => n.name === networkName);
    if (index === -1) {
      return;
    }
    NetworkController.NETWORKS[index].explorerUrl = DEFAULT_NETWORK_URLS[networkName];
    Insight.clearBaseURLOverride(NetworkController.NETWORKS[index].network.info.name);
  };

  private handleMessage = (request: any, _: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    try {
      switch (request.type) {
        case MESSAGE_TYPE.CHANGE_NETWORK:
          this.changeNetwork(request.networkIndex);
          break;
        case MESSAGE_TYPE.GET_NETWORKS:
          sendResponse(this.visibleNetworks);
          break;
        case MESSAGE_TYPE.GET_NETWORK_INDEX:
          sendResponse(this.networkIndex);
          break;
        case MESSAGE_TYPE.GET_NETWORK_EXPLORER_URL:
          sendResponse(this.explorerUrl);
          break;
        case MESSAGE_TYPE.GET_NETWORK_EXPLORER_TOKEN_URL:
          sendResponse(this.tokenUrl);
          break;
        case MESSAGE_TYPE.GET_NETWORK_EXPLORER_MRC721_URL:
          sendResponse(this.mrc721Url);
          break;
        case MESSAGE_TYPE.GET_NETWORK_ENDPOINT_OVERRIDES:
          sendResponse(this.endpointOverrides);
          break;
        case MESSAGE_TYPE.SAVE_NETWORK_ENDPOINT_OVERRIDE:
          this.saveEndpointOverride(request.networkName, request.url);
          break;
        case MESSAGE_TYPE.GET_REGTEST_ENABLED:
          sendResponse(this.regtestEnabled);
          break;
        case MESSAGE_TYPE.SAVE_REGTEST_ENABLED:
          this.saveRegtestEnabled(request.enabled);
          break;
        case MESSAGE_TYPE.GET_FEE_RATE_TIERS:
          this.getFeeRateTiers().then(sendResponse);
          return true;
        default:
          break;
      }
    } catch (err: any) {
      console.error(err);
      this.main.displayErrorOnPopup(err);
    }
    return false;
  };
}
