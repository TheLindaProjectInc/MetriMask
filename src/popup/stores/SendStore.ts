import { observable, computed, action, reaction } from 'mobx';
import { find } from 'lodash';

import AppStore from './AppStore';
import { SEND_STATE, MESSAGE_TYPE } from '../../constants';
import { isValidAddress, isValidAmount, isValidGasLimit, isValidGasPrice } from '../../utils';
import MRCToken from '../../models/MRCToken';
import Config from '../../config';
import { FeeSpeed } from '../components/NetworkFeeControl';
import {
  decodeQrCodesFromDataUrl, parseAddressFromQrText, getTabDevicePixelRatio, injectQrOverlay,
} from '../utils/qrOverlay';

const NETWORK_FEE_ESTIMATE_DEBOUNCE_MS = 200;

const INIT_VALUES = {
  tokens: [],
  senderAddress: undefined,
  receiverAddress: '',
  token: undefined,
  amount: '',
  maxAmount: undefined,
  maxMetrixSend: undefined,
  sendState: SEND_STATE.INITIAL,
  errorMessage: undefined,
  feeSpeed: 'normal' as FeeSpeed,
  feeRateTiers: undefined,
  networkFee: undefined,
  isCustomFee: false,
  customFeeRate: undefined,
  mrxUsdRate: undefined,
  gasLimit: Config.TRANSACTION.DEFAULT_GAS_LIMIT,
  gasPrice: Config.TRANSACTION.DEFAULT_GAS_PRICE * 1e8, // MRX satoshi/gas
  gasLimitRecommendedAmount: Config.TRANSACTION.DEFAULT_GAS_LIMIT,
  gasPriceRecommendedAmount: Config.TRANSACTION.DEFAULT_GAS_PRICE * 1e8, // MRX satoshi/gas
};

export default class SendStore {
  @observable public tokens: MRCToken[] = INIT_VALUES.tokens;
  @observable public senderAddress?: string = INIT_VALUES.senderAddress;
  @observable public receiverAddress?: string = INIT_VALUES.receiverAddress;
  @observable public token?: MRCToken = INIT_VALUES.token;
  @observable public amount: number | string = INIT_VALUES.amount;
  @observable public maxMetrixSend?: number = INIT_VALUES.maxMetrixSend;
  @observable public feeSpeed: FeeSpeed = INIT_VALUES.feeSpeed;
  @observable public feeRateTiers?: { slow: number; normal: number; fast: number } = INIT_VALUES.feeRateTiers;
  @observable public networkFee?: number = INIT_VALUES.networkFee; // satoshi
  @observable public isCustomFee: boolean = INIT_VALUES.isCustomFee;
  @observable public customFeeRate?: number = INIT_VALUES.customFeeRate; // satoshi/byte
  @observable public mrxUsdRate?: number = INIT_VALUES.mrxUsdRate;
  @observable public gasLimit: number = INIT_VALUES.gasLimitRecommendedAmount;
  @observable public gasPrice: number = INIT_VALUES.gasPriceRecommendedAmount;
  public gasLimitRecommendedAmount: number = INIT_VALUES.gasLimitRecommendedAmount;
  public gasPriceRecommendedAmount: number = INIT_VALUES.gasPriceRecommendedAmount;
  @observable public sendState: SEND_STATE = INIT_VALUES.sendState;
  @observable public errorMessage?: string = INIT_VALUES.errorMessage;
  @observable public qrScanning = false;
  @observable public qrScanError?: string = undefined;
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
  @computed public get receiverFieldError(): string | undefined {
    return isValidAddress(this.app.sessionStore.isMainNet, this.receiverAddress)
      ? undefined : 'Not a valid Metrix address';
  }
  @computed public get amountFieldError(): string | undefined {
    return this.maxAmount && isValidAmount(Number(this.amount), this.maxAmount) ? undefined : 'Not a valid amount';
  }
  @computed public get gasLimitFieldError(): string | undefined {
    return isValidGasLimit(this.gasLimit) ? undefined : 'Not a valid gas limit';
  }
  @computed public get gasPriceFieldError(): string | undefined {
    return isValidGasPrice(this.gasPrice) ? undefined : 'Not a valid gas price';
  }
  @computed public get buttonDisabled(): boolean {
    return !this.senderAddress || !!this.receiverFieldError || !this.token || !!this.amountFieldError;
  }
  @computed public get maxAmount(): number | undefined {
    if (this.token) {
      if (this.token.symbol === 'MRX') {
        return this.maxMetrixSend;
      }
      return this.token.balance;
    }
    return undefined;
  }

  private app: AppStore;

  constructor(app: AppStore) {
    this.app = app;
  }

  @action
  public init = () => {
    chrome.runtime.onMessage.addListener(this.handleMessage);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_MRC_TOKEN_LIST }, (response: any) => {
      this.tokens = response;
      this.tokens.unshift(new MRCToken('Metrix Token', 'MRX', 8, ''));
      this.tokens[0].balance = this.app.sessionStore.info ? this.app.sessionStore.info.balance : undefined;
      this.token = this.tokens[0];
    });
    this.senderAddress = this.app.sessionStore.info ? this.app.sessionStore.info.addrStr : undefined;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.GET_MAX_MRX_SEND,
    });

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
        this.token && this.token.symbol,
      ],
      () => this.scheduleNetworkFeeEstimate()
    );
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

  private feeEstimateTimer?: ReturnType<typeof setTimeout>;

  private scheduleNetworkFeeEstimate = () => {
    if (this.feeEstimateTimer) {
      clearTimeout(this.feeEstimateTimer);
    }
    this.feeEstimateTimer = setTimeout(this.updateNetworkFeeEstimate, NETWORK_FEE_ESTIMATE_DEBOUNCE_MS);
  };

  @action
  private updateNetworkFeeEstimate = () => {
    const feeRate = this.effectiveFeeRate;
    if (!feeRate || !this.token) {
      return;
    }

    const isMrx = this.token.symbol === 'MRX';
    const amountSatoshi = isMrx
      ? Math.round(Number(this.amount || 0) * 1e8)
      : Math.round(Number(this.gasLimit || 0) * Number(this.gasPrice || 0));

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
  public scanQrFromPage = async () => {
    this.qrScanError = undefined;
    this.qrScanning = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || !tab.windowId) {
        console.error('scanQrFromPage: no active tab found', tab);
        this.qrScanError = 'Cannot scan this page.';
        return;
      }

      let dataUrl: string;
      try {
        dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      } catch (err) {
        console.error('scanQrFromPage: captureVisibleTab failed for', tab.url, err);
        this.qrScanError = 'Cannot scan this page.';
        return;
      }

      const boxes = await decodeQrCodesFromDataUrl(dataUrl);
      if (boxes.length === 0) {
        this.qrScanError = 'No QR code found on this page.';
        return;
      }

      const dpr = await getTabDevicePixelRatio(tab.id);
      await injectQrOverlay(tab.id, boxes.map((box) => ({ ...box, text: parseAddressFromQrText(box.text) })), dpr);
    } catch (err) {
      console.error('scanQrFromPage: unexpected failure', err);
      this.qrScanError = 'Cannot scan this page.';
    } finally {
      this.qrScanning = false;
    }
  };

  @action
  public changeToken = (tokenSymbol: string) => {
    const token = find(this.tokens, { symbol: tokenSymbol });
    if (token) {
      this.token = token;
    }
  };

  @action
  public routeToSendConfirm = () => {
    this.app.routerStore.push('/send-confirm');
  };

  @action
  public send = () => {
    if (!this.token) {
      return;
    }

    this.sendState = SEND_STATE.SENDING;
    if (this.token.symbol === 'MRX') {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.SEND_TOKENS,
        receiverAddress: this.receiverAddress,
        amount: Number(this.amount),
        feeRate: this.effectiveFeeRate,
      });
    } else {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.SEND_MRC_TOKENS,
        receiverAddress: this.receiverAddress,
        amount: Number(this.amount),
        token: this.token,
        gasLimit: Number(this.gasLimit),
        gasPrice: Number(this.gasPrice),
        feeRate: this.effectiveFeeRate,
      });
    }
  };

  @action
  private handleMessage = (request: any) => {
    switch (request.type) {
      case MESSAGE_TYPE.SEND_TOKENS_SUCCESS:
        this.app.routerStore.push('/home'); // so pressing back won't go back to sendConfirm page
        this.app.routerStore.push('/account-detail');
        this.sendState = SEND_STATE.INITIAL;
        break;
      case MESSAGE_TYPE.SEND_TOKENS_FAILURE:
        this.sendState = SEND_STATE.INITIAL;
        this.errorMessage = request.error.message;
        break;
      case MESSAGE_TYPE.GET_MAX_MRX_SEND_RETURN:
        const metrixToken = this.tokens[0];
        this.maxMetrixSend = request.maxMetrixAmount / (10 ** metrixToken.decimals);
        break;
      case MESSAGE_TYPE.QR_CODE_SELECTED:
        this.receiverAddress = request.address;
        break;
      default:
        break;
    }
  };
}
