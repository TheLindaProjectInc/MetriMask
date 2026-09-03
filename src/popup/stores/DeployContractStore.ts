import { observable, computed, action, reaction } from 'mobx';

import { MESSAGE_TYPE } from '../../constants';
import Config from '../../config';
import { FeeSpeed } from '../components/NetworkFeeControl';

const NETWORK_FEE_ESTIMATE_DEBOUNCE_MS = 200;

const INIT_VALUES = {
  bytecode: '',
  gasLimit: Config.TRANSACTION.DEFAULT_GAS_LIMIT,
  gasPrice: Config.TRANSACTION.DEFAULT_GAS_PRICE * 1e8, // MRX satoshi/gas
  feeSpeed: 'normal' as FeeSpeed,
};

export default class DeployContractStore {
  @observable public bytecode: string = INIT_VALUES.bytecode;
  @observable public gasLimit: number = INIT_VALUES.gasLimit;
  @observable public gasPrice: number = INIT_VALUES.gasPrice;
  @observable public feeSpeed: FeeSpeed = INIT_VALUES.feeSpeed;
  @observable public feeRateTiers?: { slow: number; normal: number; fast: number } = undefined;
  @observable public networkFee?: number = undefined; // satoshi
  @observable public isCustomFee = false;
  @observable public customFeeRate?: number = undefined; // satoshi/byte
  @observable public mrxUsdRate?: number = undefined;
  @observable public deploying = false;
  @observable public errorMessage?: string = undefined;
  @observable public deployedTxid?: string = undefined;

  public gasLimitRecommendedAmount = Config.TRANSACTION.DEFAULT_GAS_LIMIT;
  public gasPriceRecommendedAmount = Config.TRANSACTION.DEFAULT_GAS_PRICE * 1e8;

  @computed public get bytecodeError(): string | undefined {
    return /^[0-9a-fA-F]+$/.test(this.bytecode) && this.bytecode.length % 2 === 0
      ? undefined : 'Bytecode must be a valid hex string (even number of characters)';
  }
  @computed public get maxTxFee(): number | undefined {
    return this.gasPrice && this.gasLimit
      ? Number(this.gasLimit) * Number(this.gasPrice) * 1e-8 : undefined;
  }
  @computed public get networkFeeLabel(): string | undefined {
    return this.networkFee !== undefined ? `${(this.networkFee * 1e-8).toFixed(8)} MRX` : undefined;
  }
  @computed public get networkFeeUsdLabel(): string | undefined {
    return this.mrxUsdRate && this.networkFee !== undefined
      ? `$${(this.networkFee * 1e-8 * this.mrxUsdRate).toFixed(2)}` : undefined;
  }
  @computed public get effectiveFeeRate(): number | undefined {
    if (this.isCustomFee && this.customFeeRate) {
      return this.customFeeRate;
    }
    return this.feeRateTiers ? this.feeRateTiers[this.feeSpeed] : undefined;
  }
  @computed public get buttonDisabled(): boolean {
    return !this.bytecode || !!this.bytecodeError || this.deploying;
  }

  private feeEstimateTimer?: ReturnType<typeof setTimeout>;

  @action
  public init = () => {
    chrome.runtime.onMessage.addListener(this.handleMessage);

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
      () => [this.gasLimit, this.gasPrice, this.feeSpeed, this.isCustomFee, this.customFeeRate],
      () => this.scheduleNetworkFeeEstimate()
    );
  };

  @action
  public changeBytecode = (bytecode: string) => {
    this.bytecode = bytecode.trim();
  };

  @action
  public changeGasLimit = (value: string) => {
    this.gasLimit = value === '' ? 0 : Number(value);
  };

  @action
  public changeGasPrice = (value: string) => {
    this.gasPrice = value === '' ? 0 : Number(value);
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

  private scheduleNetworkFeeEstimate = () => {
    if (this.feeEstimateTimer) {
      clearTimeout(this.feeEstimateTimer);
    }
    this.feeEstimateTimer = setTimeout(this.updateNetworkFeeEstimate, NETWORK_FEE_ESTIMATE_DEBOUNCE_MS);
  };

  @action
  private updateNetworkFeeEstimate = () => {
    const feeRate = this.effectiveFeeRate;
    if (!feeRate) {
      return;
    }

    const amountSatoshi = Math.round(Number(this.gasLimit || 0) * Number(this.gasPrice || 0));

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

  @action
  public deploy = () => {
    if (this.buttonDisabled) {
      return;
    }

    this.deploying = true;
    this.errorMessage = undefined;
    this.deployedTxid = undefined;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.DEPLOY_CONTRACT,
      bytecode: this.bytecode,
      gasLimit: Number(this.gasLimit),
      gasPrice: Number(this.gasPrice),
      feeRate: this.effectiveFeeRate,
    });
  };

  @action
  private handleMessage = (request: any) => {
    switch (request.type) {
      case MESSAGE_TYPE.DEPLOY_CONTRACT_SUCCESS:
        this.deploying = false;
        this.deployedTxid = request.txid;
        this.bytecode = '';
        break;
      case MESSAGE_TYPE.DEPLOY_CONTRACT_FAILURE:
        this.deploying = false;
        this.errorMessage = request.error.message;
        break;
      default:
        break;
    }
  };
}
