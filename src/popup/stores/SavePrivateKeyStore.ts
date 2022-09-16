import { observable, action, computed } from 'mobx';

import AppStore from './AppStore';
import { isEmpty } from 'lodash';
import { MESSAGE_TYPE } from '../../constants';

const INIT_VALUES = {
  privateKey: '',
  walletName: '',
  password: '',
  invalidPassword: undefined
};

export default class SavePrivateKeyStore {
  @observable public privateKey: string = INIT_VALUES.privateKey;
  @observable public password: string = INIT_VALUES.password;
  @observable public invalidPassword?: boolean = INIT_VALUES.invalidPassword;
  public walletName: string = INIT_VALUES.walletName;

  @computed public get disabled(): boolean {
    return this.password.length === 0 ? true : false;
  }

  @computed public get error(): boolean {
    return isEmpty(this.password);
  }

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
  }

  @action
  public init = () => {
    chrome.runtime.onMessage.addListener(this.handleMessage);
  };

  public deinit = () => {
    this.reset();
    chrome.runtime.onMessage.removeListener(this.handleMessage);
  };

  confirmLogin = () => {
    if (this.error === false) {
      this.app.routerStore.push('/loading');
      chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.CONFIRM_PASSWORD,
          password: this.password
      });
    }
  };

  savePrivateKey = () => {
    this.app.routerStore.push('/loading');
    chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.SAVE_PRIVATE_KEY_TO_FILE,
        accountName: this.walletName,
        key: this.privateKey
    });
  };

  @action
  public reset = () => Object.assign(this, INIT_VALUES);

  @action
  private handleMessage = (request: any) => {
    switch (request.type) {
      case MESSAGE_TYPE.GET_PRIVATE_KEY:
        const { privateKey, walletName } = request;
        this.walletName = walletName;
        this.privateKey = privateKey;
        break;
      default:
        break;
    }
  };
}
