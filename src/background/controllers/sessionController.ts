import MetriMaskController from '.';
import IController from './iController';
import {
  MESSAGE_TYPE,
  RESPONSE_TYPE,
  METRIMASK_ACCOUNT_CHANGE,
  STORAGE
} from '../../constants';

const MIN_IDLE_DETECTION_SECONDS = 15; // chrome.idle.setDetectionInterval enforces this floor

export default class SessionController extends IController {
  private sessionLogoutInterval = 600000; // in ms
  private darkMode = false;
  private developerModeEnabled = false;

  constructor(main: MetriMaskController) {
    super('session', main);

    // Check for session timeout in local storage, override the wallet default if found
    chrome.storage.local.get([STORAGE.WALLET_TIMEOUT],({walletTimeout}) => {
        if(walletTimeout !== undefined) {
          this.sessionLogoutInterval = walletTimeout;
        }
        console.log('Session Logout Interval set to: ' + this.sessionLogoutInterval.toString());
        this.applyIdleDetectionInterval();
    });

    // Check for dark mode preference in local storage
    chrome.storage.local.get([STORAGE.DARK_MODE], ({ darkMode }) => {
      if (darkMode !== undefined) {
        this.darkMode = darkMode;
      }
    });

    // Check for developer mode preference in local storage
    chrome.storage.local.get([STORAGE.DEVELOPER_MODE_ENABLED], ({ developerModeEnabled }) => {
      if (developerModeEnabled !== undefined) {
        this.developerModeEnabled = developerModeEnabled;
      }
    });

      chrome.runtime.onMessage.addListener(this.handleMessage);
      // The wallet's UI (side panel) can stay open and mounted indefinitely, so auto-logout
      // can't be tied to the popup closing/reopening any more -- use OS-level input idle
      // detection instead, which works regardless of whether the UI is currently open.
      chrome.idle.onStateChanged.addListener(this.handleIdleStateChanged);

      this.initFinished();
  }

  /*
   * Keeps chrome.idle's detection threshold in sync with the configured session logout
   * interval (skipped entirely when the interval is 0, i.e. "None").
   */
  private applyIdleDetectionInterval = () => {
    if (this.sessionLogoutInterval > 0) {
      chrome.idle.setDetectionInterval(
        Math.max(MIN_IDLE_DETECTION_SECONDS, Math.round(this.sessionLogoutInterval / 1000))
      );
    }
  };

  private handleIdleStateChanged = (state: chrome.idle.IdleState) => {
    if (
      this.sessionLogoutInterval > 0 &&
      (state === 'idle' || state === 'locked') &&
      this.main.account.loggedInAccount
    ) {
      this.main.account.logoutAccount();
    }
  };

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
              this.applyIdleDetectionInterval();
              console.log('walletTimeout set');
            }
          );
          break;
        case MESSAGE_TYPE.GET_DARK_MODE:
          sendResponse(this.darkMode);
          break;
        case MESSAGE_TYPE.SAVE_DARK_MODE:
          chrome.storage.local.set({ [STORAGE.DARK_MODE]: request.value },
            () => {
              this.darkMode = request.value;
            }
          );
          break;
        case MESSAGE_TYPE.GET_DEVELOPER_MODE_ENABLED:
          sendResponse(this.developerModeEnabled);
          break;
        case MESSAGE_TYPE.SAVE_DEVELOPER_MODE_ENABLED:
          chrome.storage.local.set({ [STORAGE.DEVELOPER_MODE_ENABLED]: request.value },
            () => {
              this.developerModeEnabled = request.value;
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
