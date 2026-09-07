import { Insight } from 'metrixjs-wallet';

/*
* Alternate data source for a metrixjs-wallet `Wallet`, backed by a local (or remote) metrixd
* daemon's JSON-RPC interface instead of the Insight/explorer REST API -- primarily for RegTest,
* which typically has no explorer running at all.
*
* Implements the same methods `Wallet` calls on `this.insight` (getInfo, listUTXOs, sendRawTx,
* contractCall, estimateFeePerByte, getTransactions, getTransactionInfo).
*
* Two different daemon capability profiles are supported, auto-detected per connection:
*
*   1. Bitcoin-Core "addressindex" extension available (getaddressbalance/getaddressutxos/
*      getaddressdeltas/getaddressmempool) -- fast, O(1)-ish indexed lookups. Preferred when
*      present, but NOT verified against a live addressindex-enabled daemon (none was available
*      while writing this) -- based on the standard convention, with a fallback to (2) if it
*      turns out to be wrong for a given daemon.
*   2. No addressindex -- confirmed live against a real regtest daemon that returned "Method not
*      found" for all of the above. Falls back to `scantxoutset` (a full UTXO-set scan) for
*      balance/UTXOs, and a bounded scan of the most recent blocks for transaction history (only
*      finds RECENT activity, and only transactions where the address appears in an output --
*      resolving vin/spending addresses isn't possible without an index, so "direction" isn't
*      reliably accurate for older/purely-outgoing transactions).
*
* IMPORTANT lesson from testing this live: profile (2)'s scantxoutset/block-scan approach does
* not scale to a real TestNet/MainNet-size chain -- confirmed live (switching to TestNet against
* a daemon without addressindex made balance/send effectively hang, scantxoutset scanning the
* entire real UTXO set from disk). It's only really viable for a small chain like RegTest. This
* is exactly why profile (1) is worth detecting and preferring when available.
*/

export interface IRpcConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  protocol?: 'http' | 'https'; // default: http
}

// How many of the most recent blocks to scan for an address's transaction history when there's
// no address index. Bounds worst-case RPC round-trips per call. Kept small deliberately: this
// was originally 500, tested only against a local RegTest chain with near-zero latency -- 500
// blocks of real TestNet-size data was never going to finish in reasonable time.
const RECENT_BLOCKS_TO_SCAN = 20;

// How many mempool transactions to inspect for the "unconfirmed incoming" estimate when there's
// no address index. A busy public network's mempool can hold thousands of transactions.
const MAX_MEMPOOL_TXS_TO_SCAN = 50;

// Concurrency cap for the batch helper below -- bounds how many requests are in flight at once
// (so a slow/remote daemon doesn't get hammered with hundreds of simultaneous requests) while
// still running well ahead of one-at-a-time.
const SCAN_CONCURRENCY = 5;

/*
* Maps over `items` with at most `limit` calls to `fn` in flight at once, preserving input
* order in the result. Sequentially awaiting one RPC call at a time turns a few hundred
* blocks/mempool entries into a few hundred round-trips of pure network latency; this cuts that
* down to roughly items.length / limit "rounds" instead.
*/
const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
};

// scantxoutset only allows one scan in flight at a time -- system-wide on the daemon, not
// per-connection. A second concurrent call errors with "Scan already in progress" (returned as
// an HTTP 500 by this daemon, confirmed live: MetriMask fires several RPC calls concurrently
// right after login -- balance, UTXOs, max-send estimate -- so without this they raced each
// other reliably). Module-level (not per-instance) so every adapter in this process serializes
// against the same queue, since separate `getInsightOverride()` calls create separate instances.
//
// This alone isn't fully sufficient: it only protects calls made within the lifetime of this
// module (i.e. this background service worker instance). Manifest V3 service workers can be
// torn down and restarted mid-flow, which resets this queue while a scan the daemon is still
// running server-side survives -- so a fresh scan after a restart can still collide with it.
// SCAN_BUSY_RETRY handles that case (and any other source of a concurrent scan) by retrying on
// the daemon's own "already in progress" error rather than relying on in-memory bookkeeping.
let scanQueue: Promise<any> = Promise.resolve();

const SCAN_ALREADY_IN_PROGRESS_RPC_CODE = -8;
const SCAN_BUSY_RETRY_ATTEMPTS = 10;
const SCAN_BUSY_RETRY_DELAY_MS = 500;

const METHOD_NOT_FOUND_RPC_CODE = -32601;

// Whether a given daemon (keyed by host:port) has the addressindex extension, cached after the
// first check so every call after the first doesn't re-probe. Module-level like scanQueue, for
// the same reason: separate `getInsightOverride()` calls create separate adapter instances
// against what's usually the same daemon.
const addressIndexSupportCache = new Map<string, boolean>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class RpcInsightAdapter {
  private config: IRpcConnectionConfig;
  private requestId = 0;

  constructor(config: IRpcConnectionConfig) {
    this.config = config;
  }

  /*
  * Lightweight connectivity check for the Settings page's "test connection" flow -- throws
  * (with the daemon's own error message where available) on auth/connection/RPC failure.
  */
  public testConnection = async (): Promise<void> => {
    await this.rpcCall('getblockcount', []);
  };

  public getInfo = async (address: string): Promise<Insight.IGetInfo> => {
    if (await this.useAddressIndex()) {
      try {
        return await this.getInfoViaAddressIndex(address);
      } catch (err) {
        console.error('RpcInsightAdapter.getInfo: address-index path failed, falling back to scantxoutset', err);
      }
    }
    return this.getInfoViaScan(address);
  };

  public listUTXOs = async (address: string): Promise<Insight.IUTXO[]> => {
    if (await this.useAddressIndex()) {
      try {
        return await this.listUTXOsViaAddressIndex(address);
      } catch (err) {
        console.error('RpcInsightAdapter.listUTXOs: address-index path failed, falling back to scantxoutset', err);
      }
    }
    return this.listUTXOsViaScan(address);
  };

  public sendRawTx = async (rawtx: string): Promise<Insight.ISendRawTxResult> => {
    const txid = await this.rpcCall('sendrawtransaction', [rawtx]);
    return { txid };
  };

  public contractCall = async (address: string, encodedData: string): Promise<Insight.IContractCall> => {
    // The daemon's own `callcontract` RPC already returns {address, executionResult} --
    // the same shape Insight's REST API itself is presumably just proxying. Not verified
    // against a real deployed contract (none was available while writing this).
    return this.rpcCall('callcontract', [address, encodedData]);
  };

  public estimateFeePerByte = async (nblocks = 6): Promise<number> => {
    try {
      const result = await this.rpcCall('estimatesmartfee', [nblocks]);
      if (!result || typeof result.feerate !== 'number') {
        return -1;
      }
      // estimatesmartfee returns MRX/KB (Bitcoin-Core convention) -- convert to satoshi/byte.
      return Math.ceil((result.feerate * 1e8) / 1000);
    } catch (err) {
      console.error('RpcInsightAdapter.estimateFeePerByte failed', err);
      return -1;
    }
  };

  public getTransactionInfo = async (id: string): Promise<Insight.IRawTransactionInfo> => {
    // No index to look up an arbitrary confirmed txid's blockhash -- works only for a mempool
    // transaction. Unused by this app's own UI (see transactionController.ts), kept for
    // interface parity.
    return this.buildTransactionInfo(id);
  };

  public getTransactions = async (address: string, pageNum = 0): Promise<Insight.IRawTransactions> => {
    if (await this.useAddressIndex()) {
      try {
        return await this.getTransactionsViaAddressIndex(address, pageNum);
      } catch (err) {
        console.error(
          'RpcInsightAdapter.getTransactions: address-index path failed, falling back to recent-block scan', err
        );
      }
    }
    return this.getTransactionsViaRecentBlocks(address, pageNum);
  };

  /*
  * Detects (once per daemon, then cached) whether the addressindex extension is available, via
  * a throwaway probe call: any response other than "method not found" (-32601) -- including a
  * validation error on the bogus probe address -- confirms the method itself exists.
  */
  private useAddressIndex = async (): Promise<boolean> => {
    const key = `${this.config.host}:${this.config.port}`;
    const cached = addressIndexSupportCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let supported: boolean;
    try {
      await this.rpcCall('getaddressbalance', [{ addresses: ['probe'] }]);
      supported = true;
    } catch (err: any) {
      supported = !(err && err.rpcCode === METHOD_NOT_FOUND_RPC_CODE);
    }
    addressIndexSupportCache.set(key, supported);
    return supported;
  };

  // ---- Address-index fast paths --------------------------------------------------------
  // Not verified against a live addressindex-enabled daemon (none was available while writing
  // this) -- based on the standard Bitcoin-Core addressindex RPC conventions. Each has a
  // fallback to the verified no-index path above if it throws for any reason.

  private getInfoViaAddressIndex = async (address: string): Promise<Insight.IGetInfo> => {
    const [balance, unconfirmedSatoshi, txids] = await Promise.all([
      this.rpcCall('getaddressbalance', [{ addresses: [address] }]),
      this.getUnconfirmedIncomingSatoshiViaAddressIndex(address),
      this.rpcCall('getaddresstxids', [{ addresses: [address] }]),
    ]);

    return {
      addrStr: address,
      balance: balance.balance / 1e8,
      balanceSat: balance.balance,
      totalReceived: balance.received / 1e8,
      totalReceivedSat: balance.received,
      totalSet: (balance.received - balance.balance) / 1e8,
      totalSentSat: balance.received - balance.balance,
      unconfirmedBalance: unconfirmedSatoshi / 1e8,
      unconfirmedBalanceSat: unconfirmedSatoshi,
      unconfirmedTxApperances: unconfirmedSatoshi > 0 ? 1 : 0,
      txApperances: (txids || []).length,
      transactions: txids || [],
    };
  };

  private listUTXOsViaAddressIndex = async (address: string): Promise<Insight.IUTXO[]> => {
    const [utxos, tipHeight]: [any[], number] = await Promise.all([
      this.rpcCall('getaddressutxos', [{ addresses: [address] }]),
      this.rpcCall('getblockcount', []),
    ]);

    return mapWithConcurrency<any, Insight.IUTXO>(utxos || [], SCAN_CONCURRENCY, async (utxo) => {
      // addressindex speeds up *finding* the UTXOs, not fetching their containing transaction --
      // still need the verbose tx (no -txindex assumed) for rawtx + stake detection, same as the
      // no-index path.
      const blockhash = await this.rpcCall('getblockhash', [utxo.height]);
      const verboseTx = await this.rpcCall('getrawtransaction', [utxo.txid, 1, blockhash]);
      const isStake = !!(verboseTx.vin && verboseTx.vin[0] && verboseTx.vin[0].coinbase);
      return {
        address,
        txid: utxo.txid,
        vout: utxo.outputIndex,
        scriptPubKey: utxo.script,
        amount: utxo.satoshis / 1e8,
        satoshis: utxo.satoshis,
        isStake,
        height: utxo.height,
        confirmations: utxo.height > 0 ? Math.max(0, tipHeight - utxo.height + 1) : 0,
        rawtx: verboseTx.hex,
      };
    });
  };

  private getUnconfirmedIncomingSatoshiViaAddressIndex = async (address: string): Promise<number> => {
    const mempool: any[] = await this.rpcCall('getaddressmempool', [{ addresses: [address] }]);
    return (mempool || [])
      .filter((delta: any) => delta.satoshis > 0)
      .reduce((sum: number, delta: any) => sum + Number(delta.satoshis), 0);
  };

  private getTransactionsViaAddressIndex = async (
    address: string, pageNum: number
  ): Promise<Insight.IRawTransactions> => {
    const pageSize = 10;
    const deltas: any[] = await this.rpcCall('getaddressdeltas', [{ addresses: [address] }]);

    const heightByTxid = new Map<string, number>();
    for (const delta of (deltas || []) as any[]) {
      heightByTxid.set(String(delta.txid), Number(delta.height));
    }
    const orderedTxids = [...heightByTxid.keys()]
      .sort((a, b) => (heightByTxid.get(b) as number) - (heightByTxid.get(a) as number));
    const pageTxids = orderedTxids.slice(pageNum * pageSize, (pageNum + 1) * pageSize);

    const txs = await mapWithConcurrency(pageTxids, SCAN_CONCURRENCY, async (txid) => {
      const height = heightByTxid.get(txid) || 0;
      const blockhash: string | undefined = height > 0 ? await this.rpcCall('getblockhash', [height]) : undefined;
      return this.buildTransactionInfo(txid, blockhash);
    });

    return {
      pagesTotal: Math.ceil(orderedTxids.length / pageSize),
      txs,
    };
  };

  // ---- No-index fallbacks ---------------------------------------------------------------
  // Verified live against a real regtest daemon without addressindex. Only really viable on a
  // small chain (see the module comment) -- this is the path that's slow/impractical on
  // TestNet/MainNet-size data, which is exactly why the address-index paths above exist.

  private getInfoViaScan = async (address: string): Promise<Insight.IGetInfo> => {
    const [scan, unconfirmedSatoshi] = await Promise.all([
      this.scanUtxoSet(address),
      this.getUnconfirmedIncomingSatoshiManual(address).catch(() => 0),
    ]);

    const balanceSat = Math.round(scan.total_amount * 1e8);

    return {
      addrStr: address,
      balance: scan.total_amount,
      balanceSat,
      // Not resolvable without an address/tx index.
      totalReceived: scan.total_amount,
      totalReceivedSat: balanceSat,
      totalSet: 0,
      totalSentSat: 0,
      unconfirmedBalance: unconfirmedSatoshi / 1e8,
      unconfirmedBalanceSat: unconfirmedSatoshi,
      unconfirmedTxApperances: unconfirmedSatoshi > 0 ? 1 : 0,
      txApperances: 0,
      transactions: [],
    };
  };

  private listUTXOsViaScan = async (address: string): Promise<Insight.IUTXO[]> => {
    const scan = await this.scanUtxoSet(address);
    const unspents: any[] = scan.unspents || [];

    return mapWithConcurrency<any, Insight.IUTXO>(unspents, SCAN_CONCURRENCY, async (utxo) => {
      // No -txindex, so getrawtransaction needs an explicit blockhash for a confirmed tx.
      // Verbosity 1 (not 0) so the coinbase/coinstake marker on vin[0] is available too --
      // scantxoutset doesn't report stake status itself, and getting this wrong matters: a
      // freshly-mined block's reward is immature (verified against a real node: getwalletinfo
      // showed a large immature_balance from 5 just-mined blocks) and metrixjs-wallet's own
      // maturity filter (getBitcoinjsUTXOs) only enforces the confirmations>=960 floor for
      // isStake UTXOs -- mislabeling one as isStake:false would offer it as spendable
      // immediately, and the network would reject the resulting broadcast.
      const blockhash = await this.rpcCall('getblockhash', [utxo.height]);
      const verboseTx = await this.rpcCall('getrawtransaction', [utxo.txid, 1, blockhash]);
      const isStake = !!(verboseTx.vin && verboseTx.vin[0] && verboseTx.vin[0].coinbase);
      return {
        address,
        txid: utxo.txid,
        vout: utxo.vout,
        scriptPubKey: utxo.scriptPubKey,
        amount: utxo.amount,
        satoshis: Math.round(utxo.amount * 1e8),
        isStake,
        height: utxo.height,
        confirmations: Math.max(0, scan.height - utxo.height + 1),
        rawtx: verboseTx.hex,
      };
    });
  };

  private scanUtxoSet = (address: string): Promise<any> => {
    const run = async () => {
      for (let attempt = 1; attempt <= SCAN_BUSY_RETRY_ATTEMPTS; attempt++) {
        try {
          const result = await this.rpcCall('scantxoutset', ['start', [`addr(${address})`]]);
          if (!result || !result.success) {
            throw new Error('scantxoutset scan failed or was aborted');
          }
          return result;
        } catch (err: any) {
          const daemonBusy = err && err.rpcCode === SCAN_ALREADY_IN_PROGRESS_RPC_CODE;
          if (!daemonBusy || attempt === SCAN_BUSY_RETRY_ATTEMPTS) {
            throw err;
          }
          await delay(SCAN_BUSY_RETRY_DELAY_MS);
        }
      }
    };
    // Chain onto the shared queue regardless of whether the previous scan succeeded or failed,
    // so one failure doesn't wedge every scan after it.
    const next = scanQueue.then(run, run);
    scanQueue = next.catch(() => undefined);
    return next;
  };

  /*
  * Sums this address's incoming (received) satoshi across mempool transactions -- an
  * approximation of "unconfirmed balance": it doesn't net out this address's own unconfirmed
  * spends, only what it's receiving. Fine for the common "I just sent/received something,
  * is it pending" case this feeds in the UI.
  */
  private getUnconfirmedIncomingSatoshiManual = async (address: string): Promise<number> => {
    const mempoolTxids: string[] = await this.rpcCall('getrawmempool', [false]);
    const amounts = await mapWithConcurrency<string, number>(
      mempoolTxids.slice(0, MAX_MEMPOOL_TXS_TO_SCAN),
      SCAN_CONCURRENCY,
      async (txid): Promise<number> => {
        try {
          const tx = await this.rpcCall('getrawtransaction', [txid, 1]); // mempool tx -- no blockhash needed
          const vout: any[] = tx.vout || [];
          return vout
            .filter((output: any) => this.outputAddresses(output).includes(address))
            .reduce((sum: number, output: any) => sum + Math.round(output.value * 1e8), 0);
        } catch (err) {
          // Raced with the tx confirming/leaving the mempool -- ignore and move on.
          return 0;
        }
      }
    );
    return amounts.reduce((sum, amount) => sum + amount, 0);
  };

  /*
  * Best-effort recent transaction history: scans the last RECENT_BLOCKS_TO_SCAN blocks for any
  * transaction with an output paying this address (see the module comment for what this misses).
  */
  private getTransactionsViaRecentBlocks = async (
    address: string, pageNum: number
  ): Promise<Insight.IRawTransactions> => {
    const pageSize = 10;
    const matches = await this.findRecentTransactionsForAddress(address);
    const page = matches.slice(pageNum * pageSize, (pageNum + 1) * pageSize);
    const txs = await mapWithConcurrency(page, SCAN_CONCURRENCY, (m) => this.buildTransactionInfo(m.txid, m.blockhash));

    return {
      pagesTotal: Math.ceil(matches.length / pageSize),
      txs,
    };
  };

  private findRecentTransactionsForAddress = async (
    address: string
  ): Promise<{ txid: string; blockhash: string }[]> => {
    const tipHeight: number = await this.rpcCall('getblockcount', []);
    const startHeight = Math.max(0, tipHeight - RECENT_BLOCKS_TO_SCAN + 1);
    const heights: number[] = [];
    for (let height = tipHeight; height >= startHeight; height--) {
      heights.push(height);
    }

    const blocks = await mapWithConcurrency(heights, SCAN_CONCURRENCY, async (height) => {
      const blockhash = await this.rpcCall('getblockhash', [height]);
      return this.rpcCall('getblock', [blockhash, 2]);
    });

    const matches: { txid: string; blockhash: string }[] = [];
    for (const block of blocks) { // Still newest-first: heights was built descending, order preserved.
      for (const tx of block.tx || []) {
        const touchesAddress = (tx.vout || []).some(
          (output: any) => this.outputAddresses(output).includes(address)
        );
        if (touchesAddress) {
          matches.push({ txid: tx.txid, blockhash: block.hash });
        }
      }
    }

    return matches;
  };

  /*
  * Naive N+1 implementation: resolves each input's source address with a separate RPC call
  * (best-effort -- fails silently for any input whose transaction isn't resolvable without an
  * index, leaving addr: ''), and fetches contract receipts best-effort. Shared by both the
  * address-index and no-index transaction-history paths.
  */
  private buildTransactionInfo = async (txid: string, blockhash?: string): Promise<Insight.IRawTransactionInfo> => {
    const params: any[] = blockhash ? [txid, 1, blockhash] : [txid, 1];
    const tx = await this.rpcCall('getrawtransaction', params);

    const vinPromises: Promise<Insight.IVin>[] = (tx.vin || []).map(async (input: any) => {
      if (!input.txid) {
        // Coinbase/coinstake input -- no previous output to resolve.
        return { txid: input.txid, addr: '' };
      }
      try {
        // No index to find this input's own blockhash -- only resolves if it's still in the
        // mempool. See the module comment: this is why vin.addr often can't be resolved here.
        const prevTx = await this.rpcCall('getrawtransaction', [input.txid, 1]);
        const prevOut = prevTx.vout[input.vout];
        return { txid: input.txid, addr: this.outputAddresses(prevOut)[0] || '' };
      } catch (err) {
        return { txid: input.txid, addr: '' };
      }
    });
    const vin = await Promise.all(vinPromises);

    const vout = (tx.vout || []).map((output: any) => ({
      // Insight's own vout.value convention is satoshi (not the Core RPC's decimal MRX) --
      // see transactionController.ts's `amount / 1E8` handling.
      value: String(Math.round(output.value * 1e8)),
      scriptPubKey: { addresses: this.outputAddresses(output) },
    }));

    let receipt: Insight.ITransactionReceipt[] = [];
    try {
      const receipts = await this.rpcCall('gettransactionreceipt', [txid]);
      receipt = receipts || [];
    } catch (err) {
      // Not a contract transaction -- no receipt.
    }

    const valueOut = (tx.vout || []).reduce((sum: number, output: any) => sum + Math.round(output.value * 1e8), 0);

    return {
      txid: tx.txid,
      version: tx.version,
      locktime: tx.locktime,
      receipt,
      vin,
      vout,
      confirmations: tx.confirmations || 0,
      time: tx.time || tx.blocktime || 0,
      valueOut,
      valueIn: 0, // Not resolved -- unused by this app's own UI.
      fees: 0, // Not resolved -- unused by this app's own UI.
      blockhash: tx.blockhash || '',
      blockheight: 0, // Not resolved without an extra getblock call -- unused by this app's own UI.
      isqrc20Transfer: receipt.length > 0,
    };
  };

  private outputAddresses = (output: any): string[] => {
    if (!output || !output.scriptPubKey) {
      return [];
    }
    if (output.scriptPubKey.addresses) {
      return output.scriptPubKey.addresses;
    }
    return output.scriptPubKey.address ? [output.scriptPubKey.address] : [];
  };

  private rpcCall = async (method: string, params: any[]): Promise<any> => {
    const { host, port, user, password, protocol = 'http' } = this.config;
    const response = await fetch(`${protocol}://${host}:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${user}:${password}`)}`,
      },
      body: JSON.stringify({ jsonrpc: '1.0', id: ++this.requestId, method, params }),
    });

    // This daemon returns a JSON-RPC error body (with a real code/message, e.g. -8 "Scan
    // already in progress") as an HTTP 500, not 200 -- read the body before giving up on a
    // non-ok status, or that real error gets thrown away in favor of a bare "HTTP 500".
    let body: any;
    try {
      body = await response.json();
    } catch (err) {
      throw new Error(`RPC ${method} failed: HTTP ${response.status}`);
    }

    if (body && body.error) {
      const error: any = new Error(`RPC ${method} failed: ${body.error.message || JSON.stringify(body.error)}`);
      error.rpcCode = body.error.code;
      throw error;
    }
    if (!response.ok) {
      throw new Error(`RPC ${method} failed: HTTP ${response.status}`);
    }
    return body.result;
  };
}
