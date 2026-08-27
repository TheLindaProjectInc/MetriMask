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
  });

  injectStylesheet(chrome.runtime.getURL('css/modal.css'));
};
