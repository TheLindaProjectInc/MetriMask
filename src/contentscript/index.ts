/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IRPCSignMessageRequest, IRPCVerifyMessageRequest } from './../types.d';

import { injectAllScripts } from './inject';
import { IExtensionAPIMessage, IRPCCallRequest, IRPCCallResponse, ICurrentAccount } from '../types';
import { TARGET_NAME, API_TYPE, MESSAGE_TYPE, RPC_METHOD, PORT_NAME } from '../constants';
import { isMessageNotValid } from '../utils';
import { postWindowMessage } from '../utils/messenger';

let port: any;

// Create a long-lived connection to the background page and inject content scripts
const setupLongLivedConnection = async (event: MessageEvent) => {
  if (event.data.message && event.data.message.type === API_TYPE.CONNECT_INPAGE_METRIMASK) {
    // Inject scripts
    await injectAllScripts();

    // Setup port
    port = chrome.runtime.connect({ name: PORT_NAME.CONTENTSCRIPT });
    port.onMessage.addListener((msg: any) => {
      if (msg.type === MESSAGE_TYPE.SEND_INPAGE_METRIMASK_ACCOUNT_VALUES) {
        // content script -> inpage and/or Dapp event listener
        postWindowMessage(TARGET_NAME.INPAGE, {
          type: API_TYPE.SEND_INPAGE_METRIMASK_ACCOUNT_VALUES,
          payload: msg.accountWrapper,
        });
      }
    });

    /*
    * Triggers when port is disconnected from other end, such as when extension is
    * uninstalled, but only if a long-lived connection was created first.
    * Does not trigger when user closes the tab, or navigates to another page.
    */
    port.onDisconnect.addListener(() => {
      handlePortDisconnected();
    });

    // request inpageAccount values from bg script
    postWindowMessage(TARGET_NAME.CONTENTSCRIPT, {
      type: API_TYPE.GET_INPAGE_METRIMASK_ACCOUNT_VALUES,
      payload: {},
    });
  }
};

/*
* This only partially resets the webpage to its pre-connected state. We remove the
* event listeners and set window.metrimask back to undefined, but there is no
* way to uninject the content scripts. This is not a big deal though as without a
* MetriMask installation, the content scripts won't do anything (neither will the
* event listeners, but we can remove them so we may as well).
* And as long as the dapp implements the handleMetriMaskInstalledOrUpdated event
* listener, the page will be refreshed if MetriMask is reinstalled.
*/
const handlePortDisconnected = () => {
  window.removeEventListener('message', handleInPageMessage, false);
  window.removeEventListener('message', setupLongLivedConnection, false);

  postWindowMessage(TARGET_NAME.INPAGE, {
    type: API_TYPE.PORT_DISCONNECTED,
    payload: {},
  });
};

const handleRPCRequest = (message: IRPCCallRequest) => {
  const { method, args, id } = message;

  // Check for logged in account first
  chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_LOGGED_IN_ACCOUNT }, (account: ICurrentAccount) => {
    if (!account) {
      // Not logged in, send error response to Inpage
      postWindowMessage<IRPCCallResponse>(TARGET_NAME.INPAGE, {
        type: API_TYPE.RPC_RESPONSE,
        payload: {
          id,
          error: 'Not logged in. Please log in to MetriMask first.',
        },
      });
      return;
    }

    switch (method) {
      case RPC_METHOD.SEND_TO_CONTRACT:
        // Inpage shows sign tx popup
        postWindowMessage<IRPCCallRequest>(TARGET_NAME.INPAGE, {
          type: API_TYPE.RPC_SEND_TO_CONTRACT,
          payload: {
            ...message,
            account,
          },
        });
        break;
      case RPC_METHOD.CALL_CONTRACT:
        // Background executes callcontract
        chrome.runtime.sendMessage({ type: MESSAGE_TYPE.EXTERNAL_CALL_CONTRACT, id, args });
        break;
      default:
        throw Error('Unhandled RPC method.');
    }
  });
};

const handleRPCSignMessageRequest = (message: IRPCSignMessageRequest) => {
  const { id } = message;

  // Check for logged in account first
  chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_LOGGED_IN_ACCOUNT }, (account: ICurrentAccount) => {
    if (!account) {
      // Not logged in, send error response to Inpage
      postWindowMessage<IRPCCallResponse>(TARGET_NAME.INPAGE, {
        type: API_TYPE.RPC_RESPONSE,
        payload: {
          id,
          error: 'Not logged in. Please log in to MetriMask first.',
        },
      });
      return;
    }

    // Inpage shows sign tx popup
    postWindowMessage<IRPCSignMessageRequest>(TARGET_NAME.INPAGE, {
      type: API_TYPE.RPC_SIGN_MESSAGE,
      payload: {
        ...message,
        account,
      },
    });
  });
};

const handleRPCVerifyMessageRequest = (message: IRPCVerifyMessageRequest) => {
  const { id, args} = message;

  // Check for logged in account first
  chrome.runtime.sendMessage({ type: MESSAGE_TYPE.GET_LOGGED_IN_ACCOUNT }, (account: ICurrentAccount) => {
    if (!account) {
      // Not logged in, send error response to Inpage
      postWindowMessage<IRPCCallResponse>(TARGET_NAME.INPAGE, {
        type: API_TYPE.RPC_RESPONSE,
        payload: {
          id,
          error: 'Not logged in. Please log in to MetriMask first.',
        },
      });
      return;
    }

    // Background execte message verification
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.EXTERNAL_VERIFY_MESSAGE, id, args });
  });
};

// Forwards the request to the bg script
const forwardInpageAccountRequest = () => {
  port.postMessage({ type: MESSAGE_TYPE.GET_INPAGE_METRIMASK_ACCOUNT_VALUES });
};

// Handle messages sent from inpage -> content script(here) -> bg script
const handleInPageMessage = (event: MessageEvent) => {
  if (isMessageNotValid(event, TARGET_NAME.CONTENTSCRIPT)) {
    return;
  }

  const message: IExtensionAPIMessage<any> = event.data.message;
  switch (message.type) {
    case API_TYPE.RPC_REQUEST:
      handleRPCRequest(message.payload);
      break;
    case API_TYPE.RPC_SIGN_MESSAGE:
      handleRPCSignMessageRequest(message.payload);
      break;
    case API_TYPE.RPC_VERIFY_MESSAGE:
      handleRPCVerifyMessageRequest(message.payload);
      break;
    case API_TYPE.GET_INPAGE_METRIMASK_ACCOUNT_VALUES:
      forwardInpageAccountRequest();
      break;
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw Error(`Contentscript processing invalid type: ${message}`);
  }
};

// Handle messages sent from bg script -> content script(here) -> inpage
const handleBackgroundScriptMessage = (message: any) => {
  switch (message.type) {
    case MESSAGE_TYPE.EXTERNAL_RPC_CALL_RETURN:
      postWindowMessage<IRPCCallResponse>(TARGET_NAME.INPAGE, {
        type: API_TYPE.RPC_RESPONSE,
        payload: message,
      });
      break;
    default:
      break;
  }
};

// Add message listeners
window.addEventListener('message', handleInPageMessage, false);
chrome.runtime.onMessage.addListener(handleBackgroundScriptMessage);
// Dapp developer triggers this event to set up window.metrimask
window.addEventListener('message', setupLongLivedConnection, false);