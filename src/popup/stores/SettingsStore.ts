import { observable } from 'mobx';

import AppStore from './AppStore';
import { INTERVAL_NAMES, MESSAGE_TYPE } from '../../constants';
import { SessionLogoutInterval } from '../../models/SessionLogoutInterval';
import RpcInsightAdapter, { IRpcConnectionConfig } from '../../models/RpcInsightAdapter';

const INIT_VALUES = {
  sessionLogoutInterval: 60000,
  darkMode: false,
  regtestEnabled: false,
  developerModeEnabled: false,
  endpointOverrides: {},
  rpcConfigs: {},
};

export interface IRpcConfigDraft {
  host: string;
  port: string;
  user: string;
  password: string;
}

const emptyRpcConfigDraft = (): IRpcConfigDraft => ({ host: 'localhost', port: '', user: '', password: '' });

const RECONNECT_MESSAGE_PAUSE_MS = 1500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class SettingsStore {
  @observable public sessionLogoutInterval: number =
    INIT_VALUES.sessionLogoutInterval;
  @observable public darkMode: boolean = INIT_VALUES.darkMode;
  @observable public regtestEnabled: boolean = INIT_VALUES.regtestEnabled;
  @observable public developerModeEnabled: boolean = INIT_VALUES.developerModeEnabled;
  @observable public endpointOverrides: Record<string, string> = INIT_VALUES.endpointOverrides;
  @observable public endpointTestState: Record<string, 'testing' | 'success' | 'error' | 'reloading'> = {};
  @observable public endpointTestMessage: Record<string, string> = {};
  // Networks with a saved local-RPC config -- presence here means the network uses local-RPC
  // mode instead of the explorer API (Developer mode only, see saveRpcConfig).
  @observable public rpcConfigs: Record<string, IRpcConnectionConfig> = INIT_VALUES.rpcConfigs;
  @observable public rpcConfigDrafts: Record<string, IRpcConfigDraft> = {};

  public sliArray: SessionLogoutInterval[];

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_SESSION_LOGOUT_INTERVAL },
      (response: any) => {
        this.sessionLogoutInterval = response;
      }
    );

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_DARK_MODE },
      (response: any) => {
        this.darkMode = !!response;
      }
    );

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_REGTEST_ENABLED },
      (response: any) => {
        this.regtestEnabled = !!response;
      }
    );

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_DEVELOPER_MODE_ENABLED },
      (response: any) => {
        this.developerModeEnabled = !!response;
      }
    );

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_NETWORK_ENDPOINT_OVERRIDES },
      (response: any) => {
        this.endpointOverrides = response || {};
      }
    );

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_NETWORK_RPC_CONFIGS },
      (response: any) => {
        this.rpcConfigs = response || {};
        Object.keys(this.rpcConfigs).forEach((networkName) => {
          const config = this.rpcConfigs[networkName];
          this.rpcConfigDrafts[networkName] = {
            host: config.host, port: String(config.port), user: config.user, password: config.password,
          };
        });
      }
    );

    this.sliArray = [
      new SessionLogoutInterval(0, INTERVAL_NAMES.NONE),
      new SessionLogoutInterval(60000, INTERVAL_NAMES.ONE_MIN),
      new SessionLogoutInterval(600000, INTERVAL_NAMES.TEN_MIN),
      new SessionLogoutInterval(1800000, INTERVAL_NAMES.THIRTY_MIN),
      new SessionLogoutInterval(7200000, INTERVAL_NAMES.TWO_HOUR),
      new SessionLogoutInterval(14400000, INTERVAL_NAMES.FOUR_HOUR)
    ];
  }

  public changeSessionLogoutInterval = (sliInterval: number) => {
    this.sessionLogoutInterval = sliInterval;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.SAVE_SESSION_LOGOUT_INTERVAL,
      value: this.sessionLogoutInterval
    });
  };

  public changeDarkMode = (darkMode: boolean) => {
    this.darkMode = darkMode;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.SAVE_DARK_MODE,
      value: this.darkMode
    });
  };

  public changeRegtestEnabled = (regtestEnabled: boolean) => {
    this.regtestEnabled = regtestEnabled;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.SAVE_REGTEST_ENABLED,
      enabled: this.regtestEnabled
    });
  };

  public changeDeveloperModeEnabled = (developerModeEnabled: boolean) => {
    this.developerModeEnabled = developerModeEnabled;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.SAVE_DEVELOPER_MODE_ENABLED,
      value: this.developerModeEnabled
    });
  };

  /*
   * Updates the field's displayed value as the user types, without persisting it yet.
   */
  public updateEndpointOverrideDraft = (networkName: string, url: string) => {
    this.endpointOverrides = { ...this.endpointOverrides, [networkName]: url };
    // Typing again after a test result should clear the stale status, not leave it showing.
    if (this.endpointTestState[networkName]) {
      this.clearEndpointStatus(networkName);
    }
  };

  /*
   * Resetting to the default doesn't need a live connectivity test -- only committing an
   * actual custom URL does.
   */
  public resetEndpointOverride = async (networkName: string) => {
    const updated = { ...this.endpointOverrides };
    delete updated[networkName];
    this.endpointOverrides = updated;

    const isActiveNetwork = this.isActiveNetwork(networkName);

    if (isActiveNetwork) {
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'reloading' };
      this.endpointTestMessage = {
        ...this.endpointTestMessage,
        [networkName]: 'Restored default. Reloading wallet...'
      };
      await delay(RECONNECT_MESSAGE_PAUSE_MS);
    } else {
      this.clearEndpointStatus(networkName);
    }

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.SAVE_NETWORK_ENDPOINT_OVERRIDE,
      networkName,
      url: ''
    });

    // The account is about to be logged out and the page navigated away from -- but
    // SettingsStore is a long-lived singleton, so clear the flag now rather than leaving
    // it stuck on "reloading" for the next time this network's field is visited.
    if (isActiveNetwork) {
      this.clearEndpointStatus(networkName);
    }
  };

  /*
   * Tests connectivity against <url>api/info (the Insight explorer's chain-info endpoint)
   * before persisting -- avoids saving a broken endpoint and getting locked into a network
   * that can no longer be reached.
   */
  public testAndSaveEndpointOverride = async (networkName: string) => {
    const url = (this.endpointOverrides[networkName] || '').trim();

    if (!url) {
      await this.resetEndpointOverride(networkName);
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'error' };
      this.endpointTestMessage = { ...this.endpointTestMessage, [networkName]: 'Must start with http:// or https://' };
      return;
    }

    const normalized = url.endsWith('/') ? url : `${url}/`;
    this.endpointOverrides = { ...this.endpointOverrides, [networkName]: normalized };
    this.endpointTestState = { ...this.endpointTestState, [networkName]: 'testing' };
    this.endpointTestMessage = { ...this.endpointTestMessage, [networkName]: '' };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let response: Response;
      try {
        response = await fetch(`${normalized}api/info`, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Unexpected response');
      }

      const isActiveNetwork = this.isActiveNetwork(networkName);
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'success' };
      this.endpointTestMessage = { ...this.endpointTestMessage, [networkName]: 'Connected successfully.' };

      if (isActiveNetwork) {
        await delay(RECONNECT_MESSAGE_PAUSE_MS);
        this.endpointTestState = { ...this.endpointTestState, [networkName]: 'reloading' };
        this.endpointTestMessage = {
          ...this.endpointTestMessage,
          [networkName]: 'Connected successfully. Reloading wallet...'
        };
        await delay(RECONNECT_MESSAGE_PAUSE_MS);
      }

      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.SAVE_NETWORK_ENDPOINT_OVERRIDE,
        networkName,
        url: normalized
      });

      // See the matching comment in resetEndpointOverride -- this store outlives the
      // reconnect, so the "reloading" flag must not be left set for next time.
      if (isActiveNetwork) {
        this.clearEndpointStatus(networkName);
      }
    } catch (err) {
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'error' };
      this.endpointTestMessage = {
        ...this.endpointTestMessage,
        [networkName]: 'Could not verify this provider (no valid response from api/info).'
      };
    }
  };

  /*
   * Toggles local-RPC mode on/off for a network. Turning it off immediately clears and
   * persists the change (falls back to the explorer). Turning it on just reveals the draft
   * fields -- nothing is persisted until testAndSaveRpcConfig succeeds.
   */
  public toggleRpcMode = (networkName: string, enabled: boolean) => {
    if (enabled) {
      if (!this.rpcConfigDrafts[networkName]) {
        this.rpcConfigDrafts = { ...this.rpcConfigDrafts, [networkName]: emptyRpcConfigDraft() };
      } else {
        // Force the fields to render even though nothing is saved yet.
        this.rpcConfigDrafts = { ...this.rpcConfigDrafts, [networkName]: { ...this.rpcConfigDrafts[networkName] } };
      }
      return;
    }

    const updatedDrafts = { ...this.rpcConfigDrafts };
    delete updatedDrafts[networkName];
    this.rpcConfigDrafts = updatedDrafts;
    this.clearEndpointStatus(networkName);

    if (this.rpcConfigs[networkName]) {
      const updatedConfigs = { ...this.rpcConfigs };
      delete updatedConfigs[networkName];
      this.rpcConfigs = updatedConfigs;
      chrome.runtime.sendMessage({ type: MESSAGE_TYPE.CLEAR_NETWORK_RPC_CONFIG, networkName });
    }
  };

  public updateRpcConfigDraft = (networkName: string, field: keyof IRpcConfigDraft, value: string) => {
    this.rpcConfigDrafts = {
      ...this.rpcConfigDrafts,
      [networkName]: { ...(this.rpcConfigDrafts[networkName] || emptyRpcConfigDraft()), [field]: value },
    };
    if (this.endpointTestState[networkName]) {
      this.clearEndpointStatus(networkName);
    }
  };

  /*
   * Tests connectivity against the daemon's own getblockcount RPC before persisting -- same
   * "don't save a config that can't actually connect" rationale as testAndSaveEndpointOverride.
   * Requires addressindex=1 on the daemon (not checked here -- only reachability/auth is).
   */
  public testAndSaveRpcConfig = async (networkName: string) => {
    const draft = this.rpcConfigDrafts[networkName];
    const port = Number(draft && draft.port);

    if (!draft || !draft.host.trim() || !port || !draft.user || !draft.password) {
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'error' };
      this.endpointTestMessage = {
        ...this.endpointTestMessage,
        [networkName]: 'Host, port, user, and password are all required.'
      };
      return;
    }

    const config: IRpcConnectionConfig = { host: draft.host.trim(), port, user: draft.user, password: draft.password };
    this.endpointTestState = { ...this.endpointTestState, [networkName]: 'testing' };
    this.endpointTestMessage = { ...this.endpointTestMessage, [networkName]: '' };

    try {
      await new RpcInsightAdapter(config).testConnection();

      const isActiveNetwork = this.isActiveNetwork(networkName);
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'success' };
      this.endpointTestMessage = { ...this.endpointTestMessage, [networkName]: 'Connected successfully.' };

      if (isActiveNetwork) {
        await delay(RECONNECT_MESSAGE_PAUSE_MS);
        this.endpointTestState = { ...this.endpointTestState, [networkName]: 'reloading' };
        this.endpointTestMessage = {
          ...this.endpointTestMessage,
          [networkName]: 'Connected successfully. Reloading wallet...'
        };
        await delay(RECONNECT_MESSAGE_PAUSE_MS);
      }

      this.rpcConfigs = { ...this.rpcConfigs, [networkName]: config };
      chrome.runtime.sendMessage({ type: MESSAGE_TYPE.SAVE_NETWORK_RPC_CONFIG, networkName, config });

      if (isActiveNetwork) {
        this.clearEndpointStatus(networkName);
      }
    } catch (err: any) {
      this.endpointTestState = { ...this.endpointTestState, [networkName]: 'error' };
      this.endpointTestMessage = {
        ...this.endpointTestMessage,
        [networkName]: (err && err.message) || 'Could not connect to this RPC daemon.'
      };
    }
  };

  private isActiveNetwork = (networkName: string): boolean => this.app.sessionStore.networkName === networkName;

  private clearEndpointStatus = (networkName: string) => {
    const updatedState = { ...this.endpointTestState };
    delete updatedState[networkName];
    this.endpointTestState = updatedState;

    const updatedMessages = { ...this.endpointTestMessage };
    delete updatedMessages[networkName];
    this.endpointTestMessage = updatedMessages;
  };
}
