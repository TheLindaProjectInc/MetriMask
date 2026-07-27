import MetriMaskController from './controllers';

const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

// @types/chrome@0.0.196 predates the sidePanel API's type definitions
if ((chrome as any).sidePanel) {
  (chrome as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: any) => console.error(err));
}

// Add instance to window for debugging
const controller = new MetriMaskController();
Object.assign(chrome.windows.getCurrent, { controller });
