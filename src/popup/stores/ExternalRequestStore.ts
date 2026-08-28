import { observable, action, computed, reaction } from 'mobx';

import AppStore from './AppStore';
import { MESSAGE_TYPE } from '../../constants';
import { IPendingExternalRequest } from '../../types';
import { FeeSpeed } from '../components/NetworkFeeControl';

// Matches the defaults sign-tx.js used to fall back to when a dApp doesn't
// specify these values (kept as-is, not the Config.TRANSACTION defaults used
// elsewhere, to avoid changing established behavior for external requests).
const DEFAULT_AMOUNT = 0;
const DEFAULT_GAS_LIMIT = 250000;
const DEFAULT_GAS_PRICE = 10000; // satoshi/gas

const NETWORK_FEE_ESTIMATE_DEBOUNCE_MS = 200;

// A gasPrice arg that isn't a whole number is expressed in MRX/gas rather than
// satoshi/gas -- normalize it to satoshi, same conversion sign-tx.js applied.
const normalizeGasPrice = (amount: number): number => (amount % 1 !== 0 ? amount * 1e8 : amount);

export default class ExternalRequestStore {
  @observable public pendingRequest?: IPendingExternalRequest = undefined;
  @observable public amount: number | string = DEFAULT_AMOUNT;
  @observable public gasLimit: number | string = DEFAULT_GAS_LIMIT;
  @observable public gasPrice: number | string = DEFAULT_GAS_PRICE;
  @observable public feeSpeed: FeeSpeed = 'normal';
  @observable public feeRateTiers?: { slow: number; normal: number; fast: number } = undefined;
  @observable public networkFee?: number = undefined; // satoshi
  @observable public isCustomFee = false;
  @observable public customFeeRate?: number = undefined; // satoshi/byte
  @observable public mrxUsdRate?: number = undefined;

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
  public get networkFeeLabel(): string | undefined {
    return this.networkFee !== undefined ? `${(this.networkFee * 1e-8).toFixed(8)} MRX` : undefined;
  }
  public get networkFeeUsdLabel(): string | undefined {
    return this.mrxUsdRate && this.networkFee !== undefined
      ? `$${(this.networkFee * 1e-8 * this.mrxUsdRate).toFixed(2)}` : undefined;
  }
  @computed public get effectiveFeeRate(): number | undefined {
    if (this.isCustomFee && this.customFeeRate) {
      return this.customFeeRate;
    }
    return this.feeRateTiers ? this.feeRateTiers[this.feeSpeed] : undefined;
  }
  public get origin(): string {
    return this.pendingRequest ? this.pendingRequest.args[0] : '';
  }
  public get message(): string {
    return this.pendingRequest ? this.pendingRequest.args[1] : '';
  }
  @computed public get balanceError(): string | undefined {
    if (!this.pendingRequest || this.pendingRequest.kind !== 'sendToContract') {
      return undefined;
    }

    const balance = this.app.sessionStore.info ? this.app.sessionStore.info.balance : undefined;
    if (balance === undefined) {
      return undefined;
    }

    const networkFeeMrx = this.networkFee !== undefined ? this.networkFee * 1e-8 : 0;
    const totalCost = Number(this.amount || 0) + this.maxTxFee + networkFeeMrx;

    return totalCost > balance ? 'Insufficient balance to cover this amount, gas, and network fee.' : undefined;
  }

  private app: AppStore;
  private feeEstimateTimer?: ReturnType<typeof setTimeout>;

  constructor(app: AppStore) {
    this.app = app;

    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_FEE_RATE_TIERS }, (tiers: any) => {
      if (chrome.runtime.lastError) {
        console.error('GET_FEE_RATE_TIERS failed:', chrome.runtime.lastError.message);
        return;
      }
      this.feeRateTiers = tiers;
      this.scheduleNetworkFeeEstimate();
    });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_MRX_USD_RATE }, (rate: number) => {
      if (chrome.runtime.lastError) {
        console.error('GET_MRX_USD_RATE failed:', chrome.runtime.lastError.message);
        return;
      }
      this.mrxUsdRate = rate;
    });

    reaction(
      () => [
        this.amount, this.gasLimit, this.gasPrice, this.feeSpeed, this.isCustomFee, this.customFeeRate,
        this.pendingRequest,
      ],
      () => this.scheduleNetworkFeeEstimate()
    );
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

  @action
  public selectFeeTier = (speed: FeeSpeed) => {
    this.feeSpeed = speed;
    this.isCustomFee = false;
  };

  @action
  public applyCustomFeeRate = (rate: number) => {
    this.customFeeRate = rate;
    this.isCustomFee = true;
  };

  public confirm = () => {
    if (!this.pendingRequest || this.balanceError) {
      return;
    }

    if (this.pendingRequest.kind === 'sendToContract') {
      const [address, data] = this.pendingRequest.args;
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.EXTERNAL_SEND_TO_CONTRACT,
        id: this.pendingRequest.id,
        args: [address, data, this.amount, this.gasLimit, this.gasPrice],
        feeRate: this.effectiveFeeRate,
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

  private scheduleNetworkFeeEstimate = () => {
    if (this.feeEstimateTimer) {
      clearTimeout(this.feeEstimateTimer);
    }
    this.feeEstimateTimer = setTimeout(this.updateNetworkFeeEstimate, NETWORK_FEE_ESTIMATE_DEBOUNCE_MS);
  };

  @action
  private updateNetworkFeeEstimate = () => {
    const feeRate = this.effectiveFeeRate;
    if (!feeRate || !this.pendingRequest || this.pendingRequest.kind !== 'sendToContract') {
      return;
    }

    const gasFeeSatoshi = Math.round(Number(this.gasLimit || 0) * Number(this.gasPrice || 0));
    const amountSatoshi = Math.round(Number(this.amount || 0) * 1e8) + gasFeeSatoshi;

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.ESTIMATE_TRANSACTION_FEE, amount: amountSatoshi, feeRate },
      (fee: number) => {
        if (chrome.runtime.lastError) {
          console.error('ESTIMATE_TRANSACTION_FEE failed:', chrome.runtime.lastError.message);
          return;
        }
        this.networkFee = fee;
      }
    );
  };

  private routeAway = () => {
    this.pendingRequest = undefined;
    this.app.routerStore.push('/home');
  };
}
