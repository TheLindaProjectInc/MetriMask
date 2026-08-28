/*
* Webpack emits a "commons.<a>-<b>.js" shared chunk only when two entries (background,
* contentscript, popup, inpage) actually share code. static/*.html reference all the
* possible combinations unconditionally, so any combination webpack didn't emit needs an
* empty placeholder file or the browser 404s trying to load a <script> that doesn't exist.
* Cross-platform replacement for the old create-empty-thunk.sh (bash-only, broke native
* Windows builds outside Git Bash/WSL).
*/
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const prefix = 'commons.';
const suffix = '.js';

const commonsThunkFileNames = [
  'all',
  'exclude-background',
  'exclude-contentscript',
  'exclude-popup',
  'exclude-inpage',
  'background-contentscript',
  'background-popup',
  'background-inpage',
  'contentscript-popup',
  'contentscript-inpage',
  'popup-inpage',
];

fs.mkdirSync(distDir, { recursive: true });

for (const commonsThunkFileName of commonsThunkFileNames) {
  const filePath = path.join(distDir, `${prefix}${commonsThunkFileName}${suffix}`);
  if (!fs.existsSync(filePath)) {
    fs.closeSync(fs.openSync(filePath, 'w'));
  }
}
