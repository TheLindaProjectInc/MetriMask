import { each, findIndex, isEmpty } from 'lodash';
import BigNumber from 'bignumber.js';
import { Insight } from 'metrixjs-wallet';
const { Mweb3 } = require('mweb3');

import MetriMaskController from '.';
import IController from './iController';
import { MESSAGE_TYPE, STORAGE, NETWORK_NAMES } from '../../constants';
import MRC721Token from '../../models/MRC721Token';
import mrc721TokenABI from '../../contracts/mrc721TokenABI';
import mainnetMrc721TokenList from '../../contracts/mainnetMrc721TokenList';
import testnetMrc721TokenList from '../../contracts/testnetMrc721TokenList';
import regtestMrc721TokenList from '../../contracts/regtestMrc721TokenList';
import { generateRequestId } from '../../utils';
import { IRPCCallResponse } from '../../types';

const INIT_VALUES = {
  mrc721tokens: undefined,
  getBalancesInterval: undefined,
};
const mweb3 = new Mweb3('window.metrimask.rpcProvider');

export default class Mrc721Controller extends IController {
  private static GET_BALANCES_INTERVAL_MS: number = 60000;

  public mrc721tokens?: MRC721Token[] = INIT_VALUES.mrc721tokens;

  private getBalancesInterval?: number = INIT_VALUES.getBalancesInterval;

  constructor(main: MetriMaskController) {
    super('mrc721token', main);

    chrome.runtime.onMessage.addListener(this.handleMessage);
    this.initFinished();
  }

  public resetTokenList = () => {
    this.mrc721tokens = INIT_VALUES.mrc721tokens;
  }

  /*
  * Init the token list based on the environment.
  */
  public initTokenList = () => {
    if (this.mrc721tokens) {
      return;
    }

    chrome.storage.local.get([this.chromeStorageAccountTokenListKey()], (res: any) => {
      if (!isEmpty(res)) {
        this.mrc721tokens = res[this.chromeStorageAccountTokenListKey()];
      } else if (this.main.network.networkName === NETWORK_NAMES.MAINNET) {
        this.mrc721tokens = mainnetMrc721TokenList;
      } else if (this.main.network.networkName === NETWORK_NAMES.TESTNET) {
        this.mrc721tokens = testnetMrc721TokenList;
      } else {
        this.mrc721tokens = regtestMrc721TokenList;
      }
    });
  }

  /*
  * Starts polling for periodic info updates.
  */
  public startPolling = async () => {
    await this.getBalances();
    if (!this.getBalancesInterval) {
      this.getBalancesInterval = window.setInterval(() => {
        this.getBalances();
      }, Mrc721Controller.GET_BALANCES_INTERVAL_MS);
    }
  }

  /*
  * Stops polling for the periodic info updates.
  */
  public stopPolling = () => {
    if (this.getBalancesInterval) {
      clearInterval(this.getBalancesInterval);
      this.getBalancesInterval = undefined;
    }
  }

  /*
  * Fetch the tokens balances via RPC calls.
  */
  private getBalances = () => {
    each(this.mrc721tokens, async (mrc721token: MRC721Token) => {
      await this.getMRCTokenBalance(mrc721token);
    });
  }

  /*
  * Makes an RPC call to the contract to get the token balance of this current wallet address.
  * @param token The MRC721Token to get the balance of.
  */
  private getMRCTokenBalance = async (mrc721token: MRC721Token) => {
    if (!this.main.account.loggedInAccount
      || !this.main.account.loggedInAccount.wallet
      || !this.main.account.loggedInAccount.wallet.mjsWallet
    ) {
      console.error('Cannot getMRCTokenBalance without wallet instance.');
      return;
    }

    const methodName = 'balanceOf';
    const data = mweb3.encoder.constructData(
      mrc721TokenABI,
      methodName,
      [this.main.account.loggedInAccount.wallet.mjsWallet.address],
    );
    const args = [mrc721token.address, data];
    const { result, error } = await this.main.rpc.callContract(generateRequestId(), args);

    if (error) {
      console.error(error);
      return;
    }

    // Decode result
    const decodedRes = mweb3.decoder.decodeCall(result, mrc721TokenABI, methodName);
    const bnBal = decodedRes!.executionResult.formattedOutput[0]; // Returns as a BN instance
    const bigNumberBal = new BigNumber(bnBal.toString(10)); // Convert to BigNumber instance
    const balance = bigNumberBal.toNumber(); // Convert to regular denomination

    // Update token balance in place
    const index = findIndex(this.mrc721tokens, { name: mrc721token.name, symbol: mrc721token.symbol });
    if (index !== -1) {
      this.mrc721tokens![index].balance = balance;
    }

    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.MRC721_TOKENS_RETURN, mrc721tokens: this.mrc721tokens });
  }

  /**
   * Gets the MRC token details (name, symbol, supportsInterface) given a contract address.
   * @param {string} contractAddress MRC token contract address.
   */
  private getMRCTokenDetails = async (contractAddress: string) => {
    let msg;

    /*
    * Further contract address validation - if the addr provided does not have name,
    * symbol, and supportsInterface fields, it will throw an error as it is not a valid
    * mrc721TokenContractAddr
    */
    try {
      // Get name
      let methodName = 'name';
      let data = mweb3.encoder.constructData(mrc721TokenABI, methodName, []);
      let { result, error }: IRPCCallResponse =
        await this.main.rpc.callContract(generateRequestId(), [contractAddress, data]);
      if (error) {
        throw Error(error);
      }
      result = mweb3.decoder.decodeCall(result, mrc721TokenABI, methodName) as Insight.IContractCall;
      const name = result.executionResult.formattedOutput[0];

      // Get symbol
      methodName = 'symbol';
      data = mweb3.encoder.constructData(mrc721TokenABI, methodName, []);
      ({ result, error } = await this.main.rpc.callContract(generateRequestId(), [contractAddress, data]));
      if (error) {
        throw Error(error);
      }
      result = mweb3.decoder.decodeCall(result, mrc721TokenABI, methodName) as Insight.IContractCall;
      const symbol = result.executionResult.formattedOutput[0];

      // Get supportsInterface (Only MRC720 has this)
      methodName = 'supportsInterface';

      // TODO: Fix this!! Correctly detects a bytes4 input but then does stringToHex conversion that results in incorrect hex rather than expected 80ac58cd.
      // For now just manually call the correct data query.
      // data = mweb3.encoder.constructData(mrc721TokenABI, methodName, ['']);
      data = '01ffc9a780ac58cd00000000000000000000000000000000000000000000000000000000';
      ({ result, error } = await this.main.rpc.callContract(generateRequestId(), [contractAddress, data]));
      if (error) {
        throw Error(error);
      }
      result = mweb3.decoder.decodeCall(result, mrc721TokenABI, methodName) as Insight.IContractCall;
      const supportsInterface = result.executionResult.formattedOutput[0];

      if (name && symbol && supportsInterface) {
        const mrc721token = new MRC721Token(name, symbol, contractAddress);
        msg = {
          type: MESSAGE_TYPE.MRC721_TOKEN_DETAILS_RETURN,
          isValid: true,
          mrc721token,
        };
      } else {
        msg = {
          type: MESSAGE_TYPE.MRC721_TOKEN_DETAILS_RETURN,
          isValid: false,
        };
      }
    } catch (err) {
      console.error(err);
      msg = {
        type: MESSAGE_TYPE.MRC721_TOKEN_DETAILS_RETURN,
        isValid: false,
      };
    }

    chrome.runtime.sendMessage(msg);
  }

  /*
  * Send MRC tokens.
  * @param receiverAddress The receiver of the send.
  * @param amount The amount to send in decimal format. (unit - whole token)
  * @param token The MRC token being sent.
  * @param gasLimit (unit - gas)
  * @param gasPrice (unit - satoshi/gas)
  */
  // private sendMRCToken = async (receiverAddress: string, amount: number, token: MRC721Token,
  //                               gasLimit: number, gasPrice: number ) => {
  //   // bn.js does not handle decimals well (Ex: BN(1.2) => 1 not 1.2) so we use BigNumber
  //   const bnAmount = new BigNumber(amount)
  //   const data = mweb3.encoder.constructData(mrc721TokenABI, 'transfer', [receiverAddress, bnAmount]);
  //   const args = [token.address, data, null, gasLimit, gasPrice];
  //   const { error } = await this.main.rpc.sendToContract(generateRequestId(), args);

  //   if (error) {
  //     console.error(error);
  //     chrome.runtime.sendMessage({ type: MESSAGE_TYPE.SEND_MRC721_TOKENS_FAILURE, error });
  //     return;
  //   }

  //   chrome.runtime.sendMessage({ type: MESSAGE_TYPE.SEND_MRC721_TOKENS_SUCCESS });
  // }

  private addToken = async (contractAddress: string, name: string, symbol: string) => {
    const newMrc721Token = new MRC721Token(name, symbol, contractAddress);
    this.mrc721tokens!.push(newMrc721Token);
    this.setTokenListInChromeStorage();
    await this.getMRCTokenBalance(newMrc721Token);
  }

  private removeToken = (contractAddress: string) => {
    const index = findIndex(this.mrc721tokens, { address: contractAddress });
    this.mrc721tokens!.splice(index, 1);
    this.setTokenListInChromeStorage();
  }

  private setTokenListInChromeStorage = () => {
    chrome.storage.local.set({
      [this.chromeStorageAccountTokenListKey()]: this.mrc721tokens,
    }, () => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.MRC721_TOKENS_RETURN,
        mrc721tokens: this.mrc721tokens,
      });
    });
  }

  private chromeStorageAccountTokenListKey = () => {
    return `${STORAGE.ACCOUNT_MRC721_TOKEN_LIST}-${this.main.account.loggedInAccount!.name}-${this.main.network.networkName}`;
  }

  private handleMessage = (request: any, _: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    try {
      switch (request.type) {
        case MESSAGE_TYPE.GET_MRC721_TOKEN_LIST:
          sendResponse(this.mrc721tokens);
          break;
        // case MESSAGE_TYPE.SEND_MRC721_TOKENS:
        //   this.sendMRCToken(request.receiverAddress, request.amount, request.token, request.gasLimit, request.gasPrice);
        //   break;
        case MESSAGE_TYPE.ADD_MRC721_TOKEN:
          this.addToken(request.contractAddress, request.name, request.symbol);
          break;
        case MESSAGE_TYPE.GET_MRC721_TOKEN_DETAILS:
          this.getMRCTokenDetails(request.contractAddress);
          break;
        case MESSAGE_TYPE.REMOVE_MRC721_TOKEN:
          this.removeToken(request.contractAddress);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(err);
      this.main.displayErrorOnPopup(err);
    }
  }
}
