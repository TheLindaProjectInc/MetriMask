[![Build Status](https://github.com/TheLindaProjectInc/MetriMask/actions/workflows/npm-yarn.yml/badge.svg)](https://github.com/TheLindaProjectInc/MetriMask/actions/workflows/npm-yarn.yml)

## Get MetriMask
Chome Web Store: https://chrome.google.com/webstore/detail/pgjlaaokfffcapdcakncnhpmigjlnpei

## Web Dapp Usage

Your dapp can use MetriMask to get information about a user's account status (whether they are logged into MetriMask, their account address, and balance). MetriMask also enables your dapp to listen to a window event for any changes to the user's account status.
Your dapp can also use metrimask to make callcontract and sendtocontract calls to the blockchain. 

### Connecting MetriMask
To use any of the above functionality, your dapp will first need to initiate a long-lived connection between MetriMask's content script and background script.
The code to do this is already in MetriMask, your dapp just needs to trigger the function by posting a window message.
`window.postMessage({ message: { type: 'CONNECT_METRIMASK' }}, '*')`

This will populate the `window.metrimask` object in your webpage. The `window.metrimask.account` values are automatically updated when a user logs in/out or the account balance changes.

```
// window.metrimask
{
  rpcProvider: MetriMaskRPCProvider,
  account: {
    loggedIn: true, 
    name: "2", 
    network: "TestNet", 
    address: "mNNiiJsBnPUZu4NwNtPaK9zyxD5ghV1By8", 
    balance: 49.10998413 
  }
}
```

### Refreshing your page when MetriMask is installed or updated
You will probably want to refresh your dapp webpage when MetriMask is installed or updated. This allows your dapp to rerun
`window.postMessage({ message: { type: 'CONNECT_METRIMASK' }}, '*')`
which would have previously failed to do anything while MetriMask was not yet installed. 
When MetriMask is installed or updated it will send all existing tabs an event message. To have that event message refresh your dapp, add the following event listener.

```
function handleMetriMaskInstalledOrUpdated(event) {
  if (event.data.message && event.data.message.type === 'METRIMASK_INSTALLED_OR_UPDATED') {
      // Refresh the page
      window.location.reload()
  }
}  
window.addEventListener('message', handleMetriMaskInstalledOrUpdated, false);
```

### MetriMask User Account Status - Login/Logout
After connecting MetriMask to your dapp, you can use an event listener to get notified of any changes to the user's account status(logging in/out, change in account balance).

```
function handleMetriMaskAcctChanged(event) {
  if (event.data.message && event.data.message.type === "METRIMASK_ACCOUNT_CHANGED") {
  	if (event.data.message.payload.error){
  		// handle error
  	}
    console.log("account:", event.data.message.payload.account)
  }
}
window.addEventListener('message', handleMetriMaskAcctChanged, false);
```

Note that `window.metrimask.account` will still get updated even if you don't set up this event listener; your Dapp just won't be notified of the changes.

### Using MetriMaskProvider

RPC calls can be directly made via `MetriMaskProvider` which is available to any webpage that connects to MetriMask.

**Make sure that `window.metrimask.rpcProvider` is defined before using it.**

```
// callcontract
const contractAddress = 'ade0d0851168114b103d1cd891506ba562b19522';
const data = '06fdde03';
window.metrimask.rpcProvider.rawCall(
  'callcontract',
  [contractAddress, data]
).then((res) => console.log(res));

// sendtocontract
const contractAddress = 'ade0d0851168114b103d1cd891506ba562b19522';
const data = 'd0821b0e0000000000000000000000000000000000000000000000000000000000000001';
const metrixAmt = 1; // optional. defaults to 0.
const gasLimit = 250000; // optional. default: 250000, max: 40000000 
const gasPrice = 5000; // optional. Metrix price per gas unit, default: 5000, min: 5000 (satoshi)
window.metrimask.rpcProvider.rawCall(
  'sendtocontract',
  [contractAddress, data, metrixAmt, gasLimit, gasPrice],
);

// signmessage
const url = window.location.origin;
const message = "This is a signed message!"; // The message to sign with currently logged in account.
const usePrefix = false; // (Optional) boolean - Use prefix '\x15Metrix Signed Message:\n' to sign the message.
window.metrimask.rpcProvider.signMessage([url, message, usePrefix]).then((result) => {
  console.log(result);
}

// verifymessage
const message = "This is a signed message!"; // Message to verify
const address = window.metrimask.account.address; // Address to verify against, this gets the currently logged in one.
const signedMessage = "ThisIsTheSignedMessageString"; // A signed message
const usePrefix = false; // (Optional) boolean - Was the prefix '\x15Metrix Signed Message:\n' use to sign the original message.
window.metrimask.rpcProvider.verifyMessage([message, address, signedMessage, usePrefix]).then((response) => {
    console.log(response); // true or false
}

// Handle incoming messages
function handleMessage(message) {
  if (message.data.target == 'metrimask-inpage') {
    // result: object
    // error: string
    const { result, error } = message.data.message.payload;
    
    if (error) {
      if (error === 'Not logged in. Please log in to MetriMask first.') {
        // Show an alert dialog that the user needs to login first
        alert(error);
      } else {
        // Handle different error than not logged in...
      }
      return;
    }

    // Do something with the message result...
  }
}
window.addEventListener('message', handleMessage, false);
```

### Using Mweb3
You may also use our Mweb3 convenience library to make `sendtocontract` or `callcontract` calls. See the instructions in the Github repo here: https://github.com/TheLindaProjectInc/mweb3-js

### Using RegTest
You can connect MetriMask to regtest. You will need to set the following in your metrixcore-node.json

```
"metrix-explorer": {
  "apiPrefix": "insight-api",
  "routePrefix": "explorer",
  ...
 },
"metrix-insight-api": {
  "routePrefix": "insight-api",
  ...
}  
```

RegTest is hidden from the network switcher by default (it's only relevant to developers/testers). To use it, open MetriMask's Settings and turn on `Enable RegTest` first — it will then appear as a network option. By default RegTest points at `http://localhost:3001`; if your node's explorer runs elsewhere, this (and Mainnet/Testnet) can be overridden per-network from the same Settings page.

## Building & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) 24 (current LTS) — required by `@zxing/library` (QR-code scanning)
- [Yarn Classic (1.x)](https://classic.yarnpkg.com/) — this project uses a `yarn.lock` v1 lockfile, not Yarn Berry
- A Chromium-based browser (Chrome, Edge, Brave, etc.)

### Build commands
The same commands work identically on **Windows, macOS, and Linux** — no WSL, Git Bash, or other Unix shell is required. Run these from the project root in whatever terminal you prefer (PowerShell, cmd.exe, Terminal, etc.):

```
yarn install --ignore-engines    # install dependencies (only needed once, or after pulling dependency changes)
yarn build                       # production build -> dist/
```

`--ignore-engines` is required: this dependency set has no single Node version that satisfies every package's declared `engines` range (`@zxing/library` needs >=24, `eslint-plugin-jsdoc` caps out at 18) — both are advisory/inaccurate for how they're actually used here (zxing runs in the browser via webpack; jsdoc is a lint-time-only devDependency), not a sign anything is actually broken.

or, for active development with auto-rebuild on file changes:

```
yarn start      # dev build with source maps, watches for changes -> dist/
```

Both write their output to the `dist/` folder. `yarn start` runs until you stop it (Ctrl+C).

### Loading the extension in Chrome
1. Run `yarn build` (or `yarn start` for a watched dev build) and wait for it to finish
2. Open Chrome and go to `chrome://extensions`
3. Turn on `Developer mode` (top right)
4. Click `Load unpacked`
5. Select the `dist` folder in this project
6. The extension should now be loaded
7. Click the MetriMask icon in the Chrome toolbar to open it — it opens as a **side panel** (not a popup), so it stays open while you interact with the page

If you're actively developing with `yarn start`, Chrome doesn't pick up rebuilt files automatically — after each rebuild, go to `chrome://extensions` and click the reload icon on the MetriMask card (and refresh any open dApp tabs/side panel).

## Security Flow
**First Time Flow**
1. `appSalt` is generated on a per-install basis
2. User enters `password` in Login page
3. `password` + `appSalt` runs through `scrpyt` encryption for ~3 seconds to generate `passwordHash`
4. User creates or imports wallet
5. `passwordHash` + wallet's `privateKey` runs through `scrypt` encryption for ~1 second to generate `encryptedPrivateKey`
6. Account is saved in storage with `encryptedPrivateKey`

**Return User Flow**
1. User enters password in Login page
2. `password` + `appSalt` runs through `scrpyt` encryption for ~3 seconds to generate `passwordHash`
3. Existing account is fetched from storage
4. `passwordHash` is used to decrypted the `encryptedPrivateKey`. On successful decryption of the wallet, the password is validated.
