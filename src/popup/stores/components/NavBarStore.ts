import { observable, action } from 'mobx';

import { MESSAGE_TYPE } from '../../../constants';
import AppStore from '../AppStore';

const INIT_VALUES = {
  settingsMenuAnchor: undefined,
};

export default class NavBarStore {
  @observable public settingsMenuAnchor?: string = INIT_VALUES.settingsMenuAnchor;

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
  }

  @action
  public reset = () => {
    Object.assign(this, INIT_VALUES);
  };

  @action
  public changeNetwork = (index: number) => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.CHANGE_NETWORK, networkIndex: index });
  };

  @action
  public fullScreen = () => {
    chrome.management.getSelf((info) => {
      chrome.tabs.create({url: 'chrome-extension://'+ info.id +'/home.html'});
    });
  };

  @action
  public routeToSettings = () => {
    this.reset();
    this.app.routerStore.push('/settings');
  };

  @action
  public routeToExportAccount = () => {
    this.reset();
    this.app.routerStore.push('/export-wallet');
  };

  @action
  public logout = () => {
    this.reset();
    this.app.routerStore.push('/loading');
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.LOGOUT });
  };

}
