import MetriMaskController from './controllers';

const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

// Add instance to window for debugging
const controller = new MetriMaskController();
Object.assign(chrome.windows.getCurrent, { controller });
