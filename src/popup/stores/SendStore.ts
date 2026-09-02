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

export interface IRecipient {
  address: string;
  amount: number | string;
}

const emptyRecipient = (): IRecipient => ({ address: '', amount: '' });

const INIT_VALUES = {
  tokens: [],
  senderAddress: undefined,
  token: undefined,
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
  // Multiple recipients are only meaningful for native MRX sends -- MRC20/MRC721 token sends
  // are a single contract call and stay restricted to recipients[0] (see changeToken).
  @observable public recipients: IRecipient[] = [emptyRecipient()];
  @observable public token?: MRCToken = INIT_VALUES.token;
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
  /*
  * Per-recipient-row {address, amount} validation errors, in the same order as `recipients`.
  */
  @computed public get recipientErrors(): { address?: string; amount?: string }[] {
    const currentNetwork = this.app.sessionStore.networks[this.app.sessionStore.networkIndex];
    return this.recipients.map((recipient) => ({
      address: currentNetwork && !isValidAddress(currentNetwork.network, recipient.address)
        ? 'Not a valid Metrix address' : undefined,
      amount: this.maxAmount !== undefined && isValidAmount(Number(recipient.amount), this.maxAmount)
        ? undefined : 'Not a valid amount',
    }));
  }
  @computed public get totalRecipientsAmount(): number {
    return this.recipients.reduce((sum, recipient) => sum + (Number(recipient.amount) || 0), 0);
  }
  /*
  * Aggregate error covering the combined total of every recipient row against the available
  * balance -- a per-row amount can individually look valid while the sum still exceeds it.
  */
  @computed public get amountFieldError(): string | undefined {
    return this.maxAmount !== undefined && isValidAmount(this.totalRecipientsAmount, this.maxAmount)
      ? undefined : 'Total amount exceeds available balance';
  }
  @computed public get gasLimitFieldError(): string | undefined {
    return isValidGasLimit(this.gasLimit) ? undefined : 'Not a valid gas limit';
  }
  @computed public get gasPriceFieldError(): string | undefined {
    return isValidGasPrice(this.gasPrice) ? undefined : 'Not a valid gas price';
  }
  @computed public get buttonDisabled(): boolean {
    return !this.senderAddress || !this.token
      || this.recipientErrors.some((error) => !!error.address || !!error.amount)
      || !!this.amountFieldError;
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
  private qrScanTargetIndex = 0;

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
        this.recipients.map((recipient) => recipient.amount), this.gasLimit, this.gasPrice, this.feeSpeed,
        this.isCustomFee, this.customFeeRate, this.token && this.token.symbol,
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

  @action
  public addRecipient = () => {
    this.recipients.push(emptyRecipient());
  };

  @action
  public removeRecipient = (index: number) => {
    if (this.recipients.length > 1) {
      this.recipients.splice(index, 1);
    }
  };

  @action
  public changeRecipientAddress = (index: number, address: string) => {
    this.recipients[index].address = address;
  };

  @action
  public changeRecipientAmount = (index: number, amount: number | string) => {
    this.recipients[index].amount = amount;
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
      ? Math.round(this.totalRecipientsAmount * 1e8)
      : Math.round(Number(this.gasLimit || 0) * Number(this.gasPrice || 0));
    // Worst case is every recipient's own output plus a change output; token sends are always
    // a single contract-call output so the default (2) is correct there.
    const numOutputs = isMrx ? this.recipients.length + 1 : undefined;

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPE.ESTIMATE_TRANSACTION_FEE, amount: amountSatoshi, feeRate, numOutputs },
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
  public scanQrFromPage = async (index = 0) => {
    this.qrScanError = undefined;
    this.qrScanning = true;
    this.qrScanTargetIndex = index;

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
      // MRC20/MRC721 sends are a single contract call -- drop any extra recipient rows.
      if (token.symbol !== 'MRX' && this.recipients.length > 1) {
        this.recipients = [this.recipients[0]];
      }
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
        recipients: this.recipients.map(({ address, amount }) => ({ address, amount: Number(amount) })),
        feeRate: this.effectiveFeeRate,
      });
    } else {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.SEND_MRC_TOKENS,
        receiverAddress: this.recipients[0].address,
        amount: Number(this.recipients[0].amount),
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
        if (this.recipients[this.qrScanTargetIndex]) {
          this.recipients[this.qrScanTargetIndex].address = request.address;
        }
        break;
      default:
        break;
    }
  };
}
