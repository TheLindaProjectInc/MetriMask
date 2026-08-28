# MetriMask Changelog

## 1.1.0 > 2.0.0

- Replace the popup with a persistent Chrome side panel, so it no longer closes when the user clicks anywhere outside it (was blocking QR scanning and other on-page interactions). The old `sign-tx`/`sign-message` popup windows are gone too; dApp transaction confirmation and message signing now happen directly in the side panel.
- Add a light/dark theme, toggleable from the navbar on every screen (previously buried in Settings), plus a card-style redesign of Home/Send/Settings/Account Detail/Account Login/Login matching the companion mobile app.
- Add QR-code scanning for the Send address field: captures the active tab, decodes any QR code(s) on the page, and highlights them for the user to click.
- Add a custom RPC/explorer endpoint override per network (Mainnet/Testnet/RegTest), with a live connectivity test before saving and a restore-default option. RegTest is now hidden from the network switcher unless explicitly enabled in Settings.
- Overhaul network fee handling for UTXO/contract sends:
  - Fixed the underlying per-byte fee calculation, which was computing a flat fee per input rather than scaling with actual transaction size, and a unit bug (dividing by 1024 instead of 1000) that was under-calculating fees and causing transactions to fail the network's minimum relay fee.
  - Added a dust threshold so uneconomical change outputs are folded into the fee instead of created.
  - Replaced the Slow/Normal/Fast dropdown with a live slider showing the actual fee rate and amount for each tier, plus a custom satoshi/byte rate option.
  - Added a network fee summary (Amount + Fee + Total) to the send confirmation screen.
  - Added a transaction status dialog reporting success or failure (with reason) after a transaction is submitted.
- Add sliders alongside the Gas Limit/Gas Price fields, and info tooltips explaining what Gas Limit, Gas Price, and Network Fee mean.
- Fix the idle session timeout not actually logging the user out.
- Fix the transaction list not refreshing in place after a send; it now refreshes automatically ~10 seconds after a broadcast (giving the indexer time to catch up) and can be refreshed manually via a new refresh button, independent of the normal 60-second poll.
- Fix a message-handling bug in the account controller where an `async` listener silently broke other controllers' asynchronous responses (fee rates, USD conversion, fee estimates) without any visible error.
- Make the build cross-platform: replace the bash-only `create-empty-thunk.sh` and `rm -rf`/background-job shell syntax in the `start`/`build` scripts with Node/`rimraf`/`concurrently` equivalents, so they run natively on Windows without WSL or Git Bash.

## 1.0.9 > 1.1.0

- Migration from TransactionBuilder to PSBT
- Rework Logout botton to logout & redirect back to password login screen
- Changing network now diverts back to the account selection screen.
- Upgrade metrixjs-wallet to 0.3.2

## 1.0.8 > 1.0.9

- Upgrade webpack to 5.74
- Move to Extension manifest v3 and rework to service_worker
- Upgrade whole host of dependancies

### 1.0.7 > 1.0.8

- Upgrade metrixjs-wallet, this contains upgrades to the bitcoinjs-lib and various other fixes in preperation for migration to PSBT and the removal of transactionb uilder.
- Fix big with transaction list failing to display when a new tx is submitted
- Fix issues with the detection of transactions originating from this wallet
- Switch build tasks to Node 16.x

