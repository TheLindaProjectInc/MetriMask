# MetriMask Changelog

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

