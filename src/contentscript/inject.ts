import { API_TYPE, TARGET_NAME } from '../constants';
import { postWindowMessage } from '../utils/messenger';

const injectScript = (src: string) => {
  return new Promise<void>((resolve) => {
    const scriptElement = document.createElement('script');
    const headOrDocumentElement = document.head || document.documentElement;

    scriptElement.onload = () => resolve();
    scriptElement.src = src;
    headOrDocumentElement.insertAdjacentElement('afterbegin', scriptElement);
  });
};

const injectStylesheet = (src: string) => {
  return new Promise<void>((resolve) => {
    const styleElement = document.createElement('link');
    const headOrDocumentElement = document.head || document.documentElement;

    styleElement.onload = () => resolve();
    styleElement.rel = 'stylesheet';
    styleElement.href = src;
    headOrDocumentElement.insertAdjacentElement('afterbegin', styleElement);
  });
};

export const injectAllScripts = async () => {
  await injectScript(chrome.runtime.getURL('commons.all.js')).then(async () => {
    await injectScript(chrome.runtime.getURL('commons.exclude-background.js'));
    await injectScript(chrome.runtime.getURL('commons.exclude-contentscript.js'));
    await injectScript(chrome.runtime.getURL('commons.exclude-popup.js'));
    await injectScript(chrome.runtime.getURL('commons.background-inpage.js'));
    await injectScript(chrome.runtime.getURL('commons.contentscript-inpage.js'));
    await injectScript(chrome.runtime.getURL('commons.popup-inpage.js'));
    await injectScript(chrome.runtime.getURL('inpage.js'));

    // Pass the Chrome extension absolute URL of the Sign Transaction dialog to the Inpage
    const signTxUrl = chrome.runtime.getURL('sign-tx.html');
    postWindowMessage(TARGET_NAME.INPAGE, {
      type: API_TYPE.SIGN_TX_URL_RESOLVED,
      payload: { url: signTxUrl },
    });

    // Pass the Chrome extension absolute URL of the Sign Message dialog to the Inpage
    const signMessageUrl = chrome.runtime.getURL('sign-message.html');
    postWindowMessage(TARGET_NAME.INPAGE, {
      type: API_TYPE.SIGN_MESSAGE_URL_RESOLVED,
      payload: { url: signMessageUrl },
    });
  });

  injectStylesheet(chrome.runtime.getURL('css/modal.css'));
};
