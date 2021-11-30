import { observable, computed, action, reaction } from 'mobx';
import { findIndex } from 'lodash';

import AppStore from './AppStore';
import { MESSAGE_TYPE } from '../../constants';
import { isValidContractAddressLength } from '../../utils';

const INIT_VALUES = {
  contractAddress: '',
  name: '',
  symbol: '',
  getMRCTokenDetailsFailed: false,
};

export default class AddMRC721TokenStore {
  @observable public contractAddress?: string = INIT_VALUES.contractAddress;
  @observable public name?: string = INIT_VALUES.name;
  @observable public symbol?: string = INIT_VALUES.symbol;
  @observable public getMRCTokenDetailsFailed?: boolean = INIT_VALUES.getMRCTokenDetailsFailed;
  @computed public get contractAddressFieldError(): string | undefined {
    return (!!this.contractAddress
      && isValidContractAddressLength(this.contractAddress)
      && !this.getMRCTokenDetailsFailed)
      ? undefined : 'Not a valid contract address';
  }
  @computed public get buttonDisabled(): boolean {
    return !this.contractAddress
      || !this.name
      || !this.symbol
      || !!this.contractAddressFieldError
      || !!this.tokenAlreadyInListError;
  }
  @computed public get tokenAlreadyInListError(): string | undefined {
    // Check if the token is already in the list
    const index = findIndex(this.app.accountDetailStore.mrc721tokens, { address: this.contractAddress });
    return (index !== -1 ? 'NFT Token already in token list' : undefined );
  }

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
    this.setInitValues();

    reaction(
      () => this.contractAddress,
      () => {
        this.resetTokenDetails();
        // If valid contract address, send rpc call to fetch other contract details
        if (this.contractAddress && !this.contractAddressFieldError) {
          chrome.runtime.sendMessage(
            { type: MESSAGE_TYPE.GET_MRC721_TOKEN_DETAILS,
              contractAddress: this.contractAddress});
        }
      },
    );
  }

  public addToken = () => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.ADD_MRC721_TOKEN,
      contractAddress: this.contractAddress,
      name: this.name,
      symbol: this.symbol,
    });
    this.app.routerStore.push('/account-detail');
    this.app.accountDetailStore.shouldScrollToBottom = true;
    this.setInitValues();
  }

  @action
  public init = () => {
    chrome.runtime.onMessage.addListener(this.handleMessage);
  }

  @action
  private setInitValues = () => {
    this.contractAddress = INIT_VALUES.contractAddress;
    this.resetTokenDetails();
  }

  @action
  private resetTokenDetails = () => {
    this.name = INIT_VALUES.name;
    this.symbol = INIT_VALUES.symbol;
    this.getMRCTokenDetailsFailed = INIT_VALUES.getMRCTokenDetailsFailed;
  }

  @action
  private handleMessage = (request: any) => {
    switch (request.type) {
      case MESSAGE_TYPE.MRC721_TOKEN_DETAILS_RETURN:
        if (request.isValid) {
          const { name, symbol } = request.mrc721token;
          this.name = name;
          this.symbol = symbol;
        } else {
          this.getMRCTokenDetailsFailed = true;
        }
        break;
      default:
        break;
    }
  }
}
