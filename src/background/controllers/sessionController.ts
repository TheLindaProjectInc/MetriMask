import MetriMaskController from '.';
import { isEmpty } from 'lodash';
import IController from './iController';
import {
  MESSAGE_TYPE,
  RESPONSE_TYPE,
  METRIMASK_ACCOUNT_CHANGE,
  STORAGE
} from '../../constants';

export default class SessionController extends IController {
  public sessionTimeout?: number = undefined;

  private sessionLogoutInterval = 600000; // in ms

  constructor(main: MetriMaskController) {
    super('session', main);

    // Check for session timeout in local storage, override the wallet default if found
    chrome.storage.local.get([STORAGE.WALLET_TIMEOUT],({walletTimeout}) => {
        if(walletTimeout !== undefined) {
          this.sessionLogoutInterval = walletTimeout;
        }
        console.log('Session Logout Interval set to: ' + this.sessionLogoutInterval.toString());
    });

      chrome.runtime.onMessage.addListener(this.handleMessage);
      // When popup is opened
      chrome.runtime.onConnect.addListener((port) => {
        this.onPopupOpened();

        // Add listener for when popup is closed
        port.onDisconnect.addListener(() => this.onPopupClosed());
      });

      this.initFinished();
  }

  /*
   * Clears all the intervals throughout the app.
   */
  public clearAllIntervals = () => {
    this.main.account.stopPolling();
    this.clearAllIntervalsExceptAccount();
  };

  /*
   * Closes the current session and resets all the necessary session values.
   */
  public clearSession = () => {
    this.main.account.resetAccount();
    this.main.token.resetTokenList();
    this.main.mrc721Token.resetTokenList();
    this.main.inpageAccount.sendInpageAccountAllPorts(METRIMASK_ACCOUNT_CHANGE.LOGOUT);
  };

  private clearAllIntervalsExceptAccount = () => {
    this.main.token.stopPolling();
    this.main.mrc721Token.stopPolling();
    this.main.external.stopPolling();
    this.main.transaction.stopPolling();
  };

  /*
   * Actions taken when the popup is opened.
   */
  private onPopupOpened = () => {
    // If port is reconnected (user reopened the popup), clear sessionTimeout
    clearTimeout(this.sessionTimeout);
  };

  /*
   * Actions taken when the popup is closed..
   */
  private onPopupClosed = () => {
    this.clearAllIntervalsExceptAccount();

    // Check if session logout is enabled
    if (this.sessionLogoutInterval > 0) {
      // Logout from bgp after interval
      this.sessionTimeout = self.setTimeout(() => {
        this.clearSession();
        this.main.crypto.resetPasswordHash();
        console.log('Session cleared');
      }, this.sessionLogoutInterval);
    }
  };

  private handleMessage = (
    request: any,
    _: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => {
    try {
      switch (request.type) {
        case MESSAGE_TYPE.RESTORE_SESSION:
          if (this.main.account.loggedInAccount) {
            sendResponse(RESPONSE_TYPE.RESTORING_SESSION);
            const isSessionRestore = true;
            this.main.account.onAccountLoggedIn(isSessionRestore);
          } else if (this.main.crypto.hasValidPasswordHash()) {
            sendResponse(RESPONSE_TYPE.RESTORING_SESSION);
            this.main.account.routeToAccountPage();
          }
          break;
        case MESSAGE_TYPE.GET_SESSION_LOGOUT_INTERVAL:
          sendResponse(this.sessionLogoutInterval);
          break;
        case MESSAGE_TYPE.SAVE_SESSION_LOGOUT_INTERVAL:
          chrome.storage.local.set({ [STORAGE.WALLET_TIMEOUT]: request.value },
            () => {
              this.sessionLogoutInterval = request.value;
              console.log('walletTimeout set');
            }
          );
          break;
        default:
          break;
      }
    } catch (err: any) {
      console.error(err);
      this.main.displayErrorOnPopup(err as Error);
    }
  };
}
