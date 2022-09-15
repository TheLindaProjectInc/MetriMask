/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { networks, Network } from 'metrixjs-wallet';

import MetriMaskController from '.';
import IController from './iController';
import { MESSAGE_TYPE, STORAGE, NETWORK_NAMES } from '../../constants';
import QryNetwork from '../../models/QryNetwork';

export default class NetworkController extends IController {
  public static NETWORKS: QryNetwork[] = [
    new QryNetwork(NETWORK_NAMES.MAINNET, networks.mainnet, 'https://explorer.metrixcoin.com/'),
    new QryNetwork(NETWORK_NAMES.TESTNET, networks.testnet, 'https://testnet-explorer.metrixcoin.com/'),
    new QryNetwork(NETWORK_NAMES.REGTEST, networks.regtest, 'http://localhost:3001/explorer/'),
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

  private networkIndex = 0;

  constructor(main: MetriMaskController) {
    super('network', main);

    chrome.runtime.onMessage.addListener(this.handleMessage);
    chrome.storage.local.get([STORAGE.NETWORK_INDEX], ({ networkIndex }: any) => {
      if (networkIndex !== undefined) {
        this.networkIndex = networkIndex;
        chrome.runtime.sendMessage({ type: MESSAGE_TYPE.CHANGE_NETWORK_SUCCESS, networkIndex: this.networkIndex });
      }

      this.initFinished();
    });
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
      this.main.account.logoutAccount();
    }
  };

  private handleMessage = (request: any, _: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    try {
      switch (request.type) {
        case MESSAGE_TYPE.CHANGE_NETWORK:
          this.changeNetwork(request.networkIndex);
          break;
        case MESSAGE_TYPE.GET_NETWORKS:
          sendResponse(NetworkController.NETWORKS);
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
        default:
          break;
      }
    } catch (err: any) {
      console.error(err);
      this.main.displayErrorOnPopup(err);
    }
  };
}
