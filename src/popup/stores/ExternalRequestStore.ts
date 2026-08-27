import { observable, action } from 'mobx';

import AppStore from './AppStore';
import { MESSAGE_TYPE } from '../../constants';
import { IPendingExternalRequest } from '../../types';

// Matches the defaults sign-tx.js used to fall back to when a dApp doesn't
// specify these values (kept as-is, not the Config.TRANSACTION defaults used
// elsewhere, to avoid changing established behavior for external requests).
const DEFAULT_AMOUNT = 0;
const DEFAULT_GAS_LIMIT = 250000;
const DEFAULT_GAS_PRICE = 10000; // satoshi/gas

// A gasPrice arg that isn't a whole number is expressed in MRX/gas rather than
// satoshi/gas -- normalize it to satoshi, same conversion sign-tx.js applied.
const normalizeGasPrice = (amount: number): number => (amount % 1 !== 0 ? amount * 1e8 : amount);

export default class ExternalRequestStore {
  @observable public pendingRequest?: IPendingExternalRequest = undefined;
  @observable public amount: number | string = DEFAULT_AMOUNT;
  @observable public gasLimit: number | string = DEFAULT_GAS_LIMIT;
  @observable public gasPrice: number | string = DEFAULT_GAS_PRICE;

  public get contractAddress(): string {
    return this.pendingRequest ? this.pendingRequest.args[0] : '';
  }
  public get rawTransaction(): string {
    if (!this.pendingRequest) {
      return '';
    }
    return JSON.stringify({ id: this.pendingRequest.id, args: this.pendingRequest.args });
  }
  public get maxTxFee(): number {
    return Math.round(Number(this.gasLimit) * Number(this.gasPrice) * 1000) / 1e11;
  }
  public get origin(): string {
    return this.pendingRequest ? this.pendingRequest.args[0] : '';
  }
  public get message(): string {
    return this.pendingRequest ? this.pendingRequest.args[1] : '';
  }

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
  }

  @action
  public init = () => {
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.GET_PENDING_EXTERNAL_REQUEST },
      (response: IPendingExternalRequest | undefined) => this.setPendingRequest(response)
    );
  };

  @action
  public setPendingRequest = (request?: IPendingExternalRequest) => {
    this.pendingRequest = request;

    if (request && request.kind === 'sendToContract') {
      const [, , amount, gasLimit, gasPrice] = request.args;
      this.amount = amount || DEFAULT_AMOUNT;
      this.gasLimit = gasLimit || DEFAULT_GAS_LIMIT;
      this.gasPrice = gasPrice ? normalizeGasPrice(Number(gasPrice)) : DEFAULT_GAS_PRICE;
    }
  };

  @action
  public changeAmount = (value: string) => {
    this.amount = value === '' ? '' : Number(value);
  };

  @action
  public changeGasLimit = (value: string) => {
    this.gasLimit = value === '' ? '' : Number(value);
  };

  @action
  public changeGasPrice = (value: string) => {
    this.gasPrice = value === '' ? '' : Number(value);
  };

  public confirm = () => {
    if (!this.pendingRequest) {
      return;
    }

    if (this.pendingRequest.kind === 'sendToContract') {
      const [address, data] = this.pendingRequest.args;
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.EXTERNAL_SEND_TO_CONTRACT,
        id: this.pendingRequest.id,
        args: [address, data, this.amount, this.gasLimit, this.gasPrice],
      });
    } else {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.EXTERNAL_SIGN_MESSAGE,
        id: this.pendingRequest.id,
        args: this.pendingRequest.args,
      });
    }

    this.routeAway();
  };

  public cancel = () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.METRIMASK_WINDOW_CLOSE });
    this.routeAway();
  };

  private routeAway = () => {
    this.pendingRequest = undefined;
    this.app.routerStore.push('/home');
  };
}
