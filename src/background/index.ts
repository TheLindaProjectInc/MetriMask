import MetriMaskController from './controllers';

// Add instance to window for debugging
const controller = new MetriMaskController();
Object.assign(chrome.windows.getCurrent, { controller });
