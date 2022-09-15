import { observable, action, computed } from 'mobx';
import { Insight } from 'metrixjs-wallet';
import { isUndefined } from 'lodash';
const { Mweb3 } = require('mweb3');

import { MESSAGE_TYPE, NETWORK_NAMES } from '../../constants';
import QryNetwork from '../../models/QryNetwork';

const INIT_VALUES = {
  networkIndex: 0,
  loggedInAccountName: undefined,
  info: undefined,
  metrixUSD: undefined,
};

const mweb3 = new Mweb3('window.metrimask.rpcProvider');

export default class SessionStore {
  @observable public networkIndex: number = INIT_VALUES.networkIndex;
  @observable public networks: QryNetwork[] = [];
  @observable public loggedInAccountName?: string = INIT_VALUES.loggedInAccountName;
  @observable public info?: Insight.IGetInfo = INIT_VALUES.info;
  @observable public hexAddress?: string = '';
  @computed public get metrixBalanceUSD() {
    return isUndefined(this.metrixUSD) ? 'Loading...' : `$${this.metrixUSD} USD`;
  }
  @computed public get networkName() {
    return this.networks[this.networkIndex].name;
  }
  @computed public get isMainNet() {
    return this.networkName === NETWORK_NAMES.MAINNET;
  }
  @computed public get networkBalAnnotation() {
    return  this.isMainNet ? '' : `(${this.networkName}, no value)`;
  }

  @computed public get hexAddr() {
    if (this.info) {
      const addr = this.info.addrStr;
      this.getHexAddress(addr).then((address) => this.hexAddress = address.substring(24, 64));
      return this.hexAddress;
    }
    return this.hexAddress;
  }

  public async getHexAddress(address: string) {
    try {
      return await mweb3.encoder.addressToHex(address);
    } catch(e) {
      console.error(e);
    }
  }

  private metrixUSD?: number = INIT_VALUES.metrixUSD;

  constructor() {
    chrome.runtime.onMessage.addListener(this.handleMessage);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_NETWORKS }, (response: any) => this.networks = response);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_NETWORK_INDEX }, (response: any) => {
      if (response !== undefined) {
        this.networkIndex = response;
      }
    });
  }

  @action
  public init = () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_LOGGED_IN_ACCOUNT_NAME }, (response: any) => {
      this.loggedInAccountName = response;
    });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_WALLET_INFO }, (response: any) => this.info = response);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_MRX_USD }, (response: any) => this.metrixUSD = response);
  };

  @action
  private handleMessage = (request: any) => {
    switch (request.type) {
      case MESSAGE_TYPE.CHANGE_NETWORK_SUCCESS:
        this.networkIndex = request.networkIndex;
        break;
      case MESSAGE_TYPE.ACCOUNT_LOGIN_SUCCESS:
        this.init();
        break;
      case MESSAGE_TYPE.GET_WALLET_INFO_RETURN:
        this.info = request.info;
        break;
      case MESSAGE_TYPE.GET_MRX_USD_RETURN:
        this.metrixUSD = request.metrixUSD;
        break;
      default:
        break;
    }
  };
}
