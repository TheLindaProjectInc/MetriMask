/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { each, findIndex, isEmpty } from 'lodash';
import BigNumber from 'bignumber.js';
import { Insight } from 'metrixjs-wallet';
const { Mweb3 } = require('mweb3');

import MetriMaskController from '.';
import IController from './iController';
import { MESSAGE_TYPE, STORAGE, NETWORK_NAMES } from '../../constants';
import MRCToken from '../../models/MRCToken';
import mrc20TokenABI from '../../contracts/mrc20TokenABI';
import mainnetTokenList from '../../contracts/mainnetTokenList';
import testnetTokenList from '../../contracts/testnetTokenList';
import regtestTokenList from '../../contracts/regtestTokenList';
import { generateRequestId } from '../../utils';
import { IRPCCallResponse } from '../../types';

const INIT_VALUES = {
  tokens: undefined,
  getBalancesInterval: undefined,
};
const mweb3 = new Mweb3('window.metrimask.rpcProvider');

export default class TokenController extends IController {
  private static GET_BALANCES_INTERVAL_MS = 60000;

  public tokens?: MRCToken[] = INIT_VALUES.tokens;

  private getBalancesInterval?: number = INIT_VALUES.getBalancesInterval;

  constructor(main: MetriMaskController) {
    super('token', main);

    chrome.runtime.onMessage.addListener(this.handleMessage);
    this.initFinished();
  }

  public resetTokenList = () => {
    this.tokens = INIT_VALUES.tokens;
  };

  /*
  * Init the token list based on the environment.
  */
  public initTokenList = () => {
    if (this.tokens) {
      return;
    }

    chrome.storage.local.get([this.chromeStorageAccountTokenListKey()], (res: any) => {
      if (!isEmpty(res)) {
        this.tokens = res[this.chromeStorageAccountTokenListKey()];
      } else if (this.main.network.networkName === NETWORK_NAMES.MAINNET) {
        this.tokens = mainnetTokenList;
      } else if (this.main.network.networkName === NETWORK_NAMES.TESTNET) {
        this.tokens = testnetTokenList;
      } else {
        this.tokens = regtestTokenList;
      }
    });
  };

  /*
  * Starts polling for periodic info updates.
  */
  public startPolling = async () => {
    this.getBalances();
    if (!this.getBalancesInterval) {
      this.getBalancesInterval = self.setInterval(() => {
        this.getBalances();
      }, TokenController.GET_BALANCES_INTERVAL_MS);
    }
  };

  /*
  * Stops polling for the periodic info updates.
  */
  public stopPolling = async () => {
    if (this.getBalancesInterval) {
      clearInterval(this.getBalancesInterval);
      this.getBalancesInterval = undefined;
    }
  };

  /*
  * Fetch the tokens balances via RPC calls.
  */
  private getBalances = () => {
    each(this.tokens, async (token: MRCToken) => {
      await this.getMRCTokenBalance(token);
    });
  };

  /*
  * Makes an RPC call to the contract to get the token balance of this current wallet address.
  * @param token The MRCToken to get the balance of.
  */
  private getMRCTokenBalance = async (token: MRCToken) => {
    if (!this.main.account.loggedInAccount
      || !this.main.account.loggedInAccount.wallet
      || !this.main.account.loggedInAccount.wallet.mjsWallet
    ) {
      console.error('Cannot getMRCTokenBalance without wallet instance.');
      return;
    }

    const methodName = 'balanceOf';
    const data = mweb3.encoder.constructData(
      mrc20TokenABI,
      methodName,
      [this.main.account.loggedInAccount.wallet.mjsWallet.address],
    );
    const args = [token.address, data];
    const { result, error } = await this.main.rpc.callContract(generateRequestId(), args);

    if (error) {
      console.error(error);
      return;
    }

    // Decode result
    const decodedRes = mweb3.decoder.decodeCall(result, mrc20TokenABI, methodName);
    const bnBal = decodedRes.executionResult.formattedOutput[0]; // Returns as a BN instance
    const bigNumberBal = new BigNumber(bnBal.toString(10) as BigNumber.Value); // Convert to BigNumber instance
    // Convert to regular denomination
    const balance = bigNumberBal.dividedBy(new BigNumber(10 ** token.decimals)).toNumber();

    // Update token balance in place
    const index = findIndex(this.tokens, { name: token.name, symbol: token.symbol });
    if (index !== -1) {
      this.tokens![index].balance = balance;
    }

    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.MRC_TOKENS_RETURN, tokens: this.tokens });
  };

  /**
   * Gets the MRC token details (name, symbol, decimals) given a contract address.
   *
   * @param {string} contractAddress MRC token contract address.
   */
  private getMRCTokenDetails = async (contractAddress: string) => {
    let msg;

    /*
    * Further contract address validation - if the addr provided does not have name,
    * symbol, and decimals fields, it will throw an error as it is not a valid
    * mrc20TokenContractAddr
    */
    try {
      // Get name
      let methodName = 'name';
      let data = mweb3.encoder.constructData(mrc20TokenABI, methodName, []);
      let { result, error }: IRPCCallResponse =
        await this.main.rpc.callContract(generateRequestId(), [contractAddress, data]);
      if (error) {
        throw Error(error);
      }
      result = mweb3.decoder.decodeCall(result, mrc20TokenABI, methodName) as Insight.IContractCall;
      const name: string = result.executionResult.formattedOutput[0];

      // Get symbol
      methodName = 'symbol';
      data = mweb3.encoder.constructData(mrc20TokenABI, methodName, []);
      ({ result, error } = await this.main.rpc.callContract(generateRequestId(), [contractAddress, data]));
      if (error) {
        throw Error(error);
      }
      result = mweb3.decoder.decodeCall(result, mrc20TokenABI, methodName) as Insight.IContractCall;
      const symbol: string = result.executionResult.formattedOutput[0];

      // Get decimals
      methodName = 'decimals';
      data = mweb3.encoder.constructData(mrc20TokenABI, methodName, []);
      ({ result, error } = await this.main.rpc.callContract(generateRequestId(), [contractAddress, data]));
      if (error) {
        throw Error(error);
      }
      result = mweb3.decoder.decodeCall(result, mrc20TokenABI, methodName) as Insight.IContractCall;
      const decimals: number = result.executionResult.formattedOutput[0];

      if (name && symbol && decimals) {
        const token = new MRCToken(name, symbol, decimals, contractAddress);
        msg = {
          type: MESSAGE_TYPE.MRC_TOKEN_DETAILS_RETURN,
          isValid: true,
          token,
        };
      } else {
        msg = {
          type: MESSAGE_TYPE.MRC_TOKEN_DETAILS_RETURN,
          isValid: false,
        };
      }
    } catch (err) {
      console.error(err);
      msg = {
        type: MESSAGE_TYPE.MRC_TOKEN_DETAILS_RETURN,
        isValid: false,
      };
    }

    chrome.runtime.sendMessage(msg);
  };

  /*
  * Send MRC tokens.
  * @param receiverAddress The receiver of the send.
  * @param amount The amount to send in decimal format. (unit - whole token)
  * @param token The MRC token being sent.
  * @param gasLimit (unit - gas)
  * @param gasPrice (unit - satoshi/gas)
  */
  private sendMRCToken = async (receiverAddress: string, amount: number, token: MRCToken,
                                gasLimit: number, gasPrice: number ) => {
    // bn.js does not handle decimals well (Ex: BN(1.2) => 1 not 1.2) so we use BigNumber
    const bnAmount = new BigNumber(amount).times(new BigNumber(10 ** token.decimals));
    const data = mweb3.encoder.constructData(mrc20TokenABI, 'transfer', [receiverAddress, bnAmount]);
    const args = [token.address, data, null, gasLimit, gasPrice];
    const { error } = await this.main.rpc.sendToContract(generateRequestId(), args);

    if (error) {
      console.error(error);
      chrome.runtime.sendMessage({ type: MESSAGE_TYPE.SEND_TOKENS_FAILURE, error });
      return;
    }

    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.SEND_TOKENS_SUCCESS });
  };

  private addToken = async (contractAddress: string, name: string, symbol: string, decimals: number) => {
    const newToken = new MRCToken(name, symbol, decimals, contractAddress);
    this.tokens!.push(newToken);
    this.setTokenListInChromeStorage();
    await this.getMRCTokenBalance(newToken);
  };

  private removeToken = (contractAddress: string) => {
    const index = findIndex(this.tokens, { address: contractAddress });
    this.tokens!.splice(index, 1);
    this.setTokenListInChromeStorage();
  };

  private setTokenListInChromeStorage = () => {
    chrome.storage.local.set({
      [this.chromeStorageAccountTokenListKey()]: this.tokens,
    }, () => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.MRC_TOKENS_RETURN,
        tokens: this.tokens,
      });
    });
  };

  private chromeStorageAccountTokenListKey = () => {
    return `${STORAGE.ACCOUNT_TOKEN_LIST}-${this.main.account.loggedInAccount!.name}-${this.main.network.networkName}`;
  };

  private handleMessage = (request: any, _: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    try {
      switch (request.type) {
        case MESSAGE_TYPE.GET_MRC_TOKEN_LIST:
          sendResponse(this.tokens);
          break;
        case MESSAGE_TYPE.SEND_MRC_TOKENS:
          this.sendMRCToken(request.receiverAddress, request.amount, request.token, request.gasLimit, request.gasPrice);
          break;
        case MESSAGE_TYPE.ADD_TOKEN:
          this.addToken(request.contractAddress, request.name, request.symbol, request.decimals);
          break;
        case MESSAGE_TYPE.GET_MRC_TOKEN_DETAILS:
          this.getMRCTokenDetails(request.contractAddress);
          break;
        case MESSAGE_TYPE.REMOVE_TOKEN:
          this.removeToken(request.contractAddress);
          break;
        default:
          break;
      }
    } catch (err: any) {
      console.error(err);
      this.main.displayErrorOnPopup(err);
    }
  };
}
