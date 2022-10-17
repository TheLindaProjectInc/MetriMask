import { action } from 'mobx';
import { Wallet as MetrixWallet, Insight, WalletRPCProvider } from 'metrixjs-wallet';
import deepEqual from 'deep-equal';

import { ISigner } from '../types';
import { ISendTxOptions } from 'metrixjs-wallet/lib/tx';
import { RPC_METHOD, NETWORK_NAMES } from '../constants';

export default class Wallet implements ISigner {
  public mjsWallet?: MetrixWallet;
  public rpcProvider?: WalletRPCProvider;
  public info?: Insight.IGetInfo;
  public metrixUSD?: number;
  public maxMetrixSend?: number;

  constructor(mjsWallet: MetrixWallet) {
    this.mjsWallet = mjsWallet;
    this.rpcProvider = new WalletRPCProvider(this.mjsWallet);
  }

  @action
  public updateInfo = async () => {
    if (!this.mjsWallet) {
      console.error('Cannot updateInfo without mjsWallet instance.');
    }

    /**
     * We add a timeout promise to handle if mjsWallet hangs when executing getInfo.
     * (This happens if the insight api is down)
     */
    let timedOut = false;
    const timeoutPromise = new Promise((_, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        timedOut = true;
        reject(Error('wallet.getInfo failed, insight api may be down'));
      }, 30000);
    });

    const getInfoPromise = this.mjsWallet!.getInfo();
    const promises = [timeoutPromise, getInfoPromise];
    let newInfo: any;
    try {
      newInfo = await Promise.race(promises);

      // if they are not equal, then the balance has changed
      if (!timedOut && !deepEqual(this.info, newInfo)) {
        this.info = newInfo;
        return true;
      }
    } catch (e: unknown) {
      if (e instanceof Error){
          throw(e);
      }
    }

    return false;
  };

  // @param amount: (unit - whole MRX)
  public send = async (to: string, amount: number, options: ISendTxOptions): Promise<Insight.ISendRawTxResult> => {
    if (!this.mjsWallet) {
      throw Error('Cannot send without wallet.');
    }

    // convert amount units from whole MRX => SATOSHI MRX
    return await this.mjsWallet.send(to, amount * 1e8, { feeRate: options.feeRate });
  };

  public sendTransaction = async (args: any[]): Promise<any> => {
    if (!this.rpcProvider) {
      throw Error('Cannot sign transaction without RPC provider.');
    }
    if (args.length < 2) {
      throw Error('Requires first two arguments: contractAddress and data.');
    }

    try {
      return await this.rpcProvider.rawCall(RPC_METHOD.SEND_TO_CONTRACT, args);
    } catch (err) {
      throw err;
    }
  };

  public calcMaxMetrixSend = async (networkName: string) => {
    if (!this.mjsWallet || !this.info) {
      throw Error('Cannot calculate max send amount without wallet or this.info.');
    }
    this.maxMetrixSend = await this.mjsWallet.sendEstimateMaxValue(this.maxMetrixSendToAddress(networkName));
    return this.maxMetrixSend;
  };

  /**
   * We just need to pass a valid sendTo address belonging to that network for the
   * metrixjs-wallet library to calculate the maxMetrixSend amount.  It does not matter what
   * the specific address is, as that does not affect the value of the
   * maxMetrixSend amount
   */
  private maxMetrixSendToAddress = (networkName: string) => {
    return networkName === NETWORK_NAMES.MAINNET ?
      'MRAfR46kJcDmURC845rSAohhJmrCfYyvPA' : 'mRGB6pSk4bY1PNxawHYWt12N5sfiyKnBa3';
  };
}
