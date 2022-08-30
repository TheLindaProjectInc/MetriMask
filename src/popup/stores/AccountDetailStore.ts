import { observable, action, reaction } from 'mobx';

import AppStore from './AppStore';
import { MESSAGE_TYPE } from '../../constants';
import Transaction from '../../models/Transaction';
import MRCToken from '../../models/MRCToken';
import MRC721Token from '../../models/MRC721Token';

const INIT_VALUES = {
  activeTabIdx: 0,
  transactions: [],
  tokens: [],
  mrc721tokens: [],
  hasMore: false,
  shouldScrollToBottom: false,
  editTokenMode: false,
};

export default class AccountDetailStore {
  @observable public activeTabIdx: number = INIT_VALUES.activeTabIdx;
  @observable public transactions: Transaction[] = INIT_VALUES.transactions;
  @observable public tokens: MRCToken[] = INIT_VALUES.tokens;
  @observable public mrc721tokens: MRC721Token[] = INIT_VALUES.mrc721tokens;
  @observable public hasMore: boolean = INIT_VALUES.hasMore;
  @observable public shouldScrollToBottom: boolean = INIT_VALUES.shouldScrollToBottom;
  @observable public editTokenMode: boolean = INIT_VALUES.editTokenMode;

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
    reaction(
      () => this.activeTabIdx,
      () => this.activeTabIdx === 0  ? this.onTransactionTabSelected() : undefined,
    );
    reaction(
      () => this.activeTabIdx,
      () => this.activeTabIdx === 1 ? this.onTokenTabSelected() : undefined,
    );
    reaction(
      () => this.activeTabIdx,
      () => this.activeTabIdx === 2 ? this.onMrc721TokenTabSelected() : undefined,
    );
  }

  @action
  public init = () => {
    chrome.runtime.onMessage.addListener(this.handleMessage);
    if (this.activeTabIdx === 0) {
      this.onTransactionTabSelected();
    } else if(this.activeTabIdx === 1) {
      this.onTokenTabSelected();
    } else if(this.activeTabIdx === 2) {
      this.onMrc721TokenTabSelected();
    }
  }

  public deinit = () => {
    chrome.runtime.onMessage.removeListener(this.handleMessage);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.STOP_TX_POLLING });
  }

  public fetchMoreTxs = () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_MORE_TXS });
  }

  public onTransactionClick = (txid: string) => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_NETWORK_EXPLORER_URL }, (response: any) => {
      chrome.tabs.create({ url: `${response}/${txid}` });
    });
  }

  public onTokenClick = (address: string) => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_NETWORK_EXPLORER_TOKEN_URL }, (response: any) => {
      chrome.tabs.create({ url: `${response}/${address}` });
    });
  }

  public onNFTClick = (address: string) => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_NETWORK_EXPLORER_MRC721_URL }, (response: any) => {
      chrome.tabs.create({ url: `${response}/${address}` });
    });
  }

  public removeToken = (contractAddress: string) => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.REMOVE_TOKEN,
      contractAddress,
    });
  }

  public removeMrc721Token = (contractAddress: string) => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.REMOVE_MRC721_TOKEN,
      contractAddress,
    });
  }

  public routeToAddToken = () => {
    this.app.routerStore.push('/add-token');
  }

  public routeToAddMrc721Token = () => {
    this.app.routerStore.push('/add-mrc721-token');
  }

  private onTransactionTabSelected = () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.START_TX_POLLING });
  }

  private onTokenTabSelected = () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_MRC_TOKEN_LIST }, (response: any) => {
      this.tokens = response;
    });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.STOP_TX_POLLING });
  }

  private onMrc721TokenTabSelected = () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_MRC721_TOKEN_LIST }, (response: any) => {
      this.mrc721tokens = response;
    });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.STOP_TX_POLLING });
  }

  @action
  private handleMessage = (request: any) => {
    switch (request.type) {
      case MESSAGE_TYPE.GET_TXS_RETURN:
        this.transactions = request.transactions;
        this.hasMore = request.hasMore;
        break;
      case MESSAGE_TYPE.MRC_TOKENS_RETURN:
        this.tokens = request.tokens;
        break;
      case MESSAGE_TYPE.MRC721_TOKENS_RETURN:
        this.mrc721tokens = request.mrc721tokens;
        break;
      default:
        break;
    }
  }
}
