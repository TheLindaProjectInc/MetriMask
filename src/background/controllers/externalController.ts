import axios from 'axios';

import MetriMaskController from '.';
import IController from './iController';
import { MESSAGE_TYPE } from '../../constants';

const INIT_VALUES = {
  getPriceInterval: undefined,
  metrixPriceUSD: 0,
};

export default class ExternalController extends IController {
  private static GET_PRICE_INTERVAL_MS = 60000;

  private getPriceInterval?: number = INIT_VALUES.getPriceInterval;
  private metrixPriceUSD: number = INIT_VALUES.metrixPriceUSD;

  constructor(main: MetriMaskController) {
    super('external', main);
    this.initFinished();
  }

  public calculateMetrixToUSD = (balance: number): number => {
    return this.metrixPriceUSD ? Number((this.metrixPriceUSD * balance).toFixed(2)) : 0;
  };

  /*
  * Starts polling for periodic info updates.
  */
  public startPolling = async () => {
    await this.getMetrixPrice();
    if (!this.getPriceInterval) {
      this.getPriceInterval = window.setInterval(() => {
        this.getMetrixPrice();
      }, ExternalController.GET_PRICE_INTERVAL_MS);
    }
  };

  /*
  * Stops polling for the periodic info updates.
  */
  public stopPolling = () => {
    if (this.getPriceInterval) {
      clearInterval(this.getPriceInterval);
      this.getPriceInterval = undefined;
    }
  };

  /*
  * Gets the current Metrix market price.
  */
  private getMetrixPrice = async () => {
    try {
      // const jsonObj = await axios.get('https://api.coinmarketcap.com/v2/ticker/1684/');
      const jsonObj = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=linda&vs_currencies=USD');
      this.metrixPriceUSD = jsonObj.data.linda.usd;

      if (this.main.account.loggedInAccount
        && this.main.account.loggedInAccount.wallet
        && this.main.account.loggedInAccount.wallet.info
      ) {
        const metrixUSD = this.calculateMetrixToUSD(this.main.account.loggedInAccount.wallet.info.balance);
        this.main.account.loggedInAccount.wallet.metrixUSD = metrixUSD;

        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.GET_MRX_USD_RETURN,
          metrixUSD,
        });
      }
    } catch (err) {
      console.log(err);
    }
  };
}
