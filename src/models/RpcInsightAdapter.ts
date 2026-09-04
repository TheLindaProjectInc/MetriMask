import { Insight } from 'metrixjs-wallet';

/*
* Alternate data source for a metrixjs-wallet `Wallet`, backed by a local (or remote) metrixd
* daemon's JSON-RPC interface instead of the Insight/explorer REST API -- primarily for RegTest,
* which typically has no explorer running at all.
*
* Implements the same methods `Wallet` calls on `this.insight` (getInfo, listUTXOs, sendRawTx,
* contractCall, estimateFeePerByte, getTransactions, getTransactionInfo), mapped onto the
* daemon's "address index" RPCs (getaddressbalance/getaddressutxos/getaddresstxids/etc, the same
* Bitcoin-Core-derived extension Qtum-family chains including Metrix use) -- these require the
* daemon to be running with `addressindex=1`.
*
* This is a best-effort implementation based on the standard Bitcoin-Core/Qtum addressindex RPC
* conventions: exact method names and response shapes have NOT been verified against a live
* metrixd node (no local daemon was available while writing this). Treat method names, param
* shapes, and unit conversions below as the first thing to check if something doesn't work
* against a real node.
*/

export interface IRpcConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  protocol?: 'http' | 'https'; // default: http
}

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
    const [balance, mempool, txids] = await Promise.all([
      this.rpcCall('getaddressbalance', [{ addresses: [address] }]),
      this.rpcCall('getaddressmempool', [{ addresses: [address] }]).catch(() => []),
      this.rpcCall('getaddresstxids', [{ addresses: [address] }]),
    ]);

    const unconfirmedBalanceSat = (mempool || []).reduce(
      (sum: number, delta: any) => sum + (Number(delta.satoshis) || 0), 0
    );

    return {
      addrStr: address,
      balance: balance.balance / 1e8,
      balanceSat: balance.balance,
      totalReceived: balance.received / 1e8,
      totalReceivedSat: balance.received,
      totalSet: (balance.received - balance.balance) / 1e8,
      totalSentSat: balance.received - balance.balance,
      unconfirmedBalance: unconfirmedBalanceSat / 1e8,
      unconfirmedBalanceSat,
      unconfirmedTxApperances: (mempool || []).length,
      txApperances: (txids || []).length,
      transactions: txids || [],
    };
  };

  public listUTXOs = async (address: string): Promise<Insight.IUTXO[]> => {
    const [utxos, tipHeight] = await Promise.all([
      this.rpcCall('getaddressutxos', [{ addresses: [address] }]),
      this.rpcCall('getblockcount', []),
    ]);

    const utxoPromises: Promise<Insight.IUTXO>[] = (utxos || []).map(async (utxo: any) => {
      // The Insight-style consumer (metrixjs-wallet's tx builder) needs the full raw transaction
      // hex to build a PSBT nonWitnessUtxo input -- fetch it per-UTXO.
      const rawtx = await this.rpcCall('getrawtransaction', [utxo.txid, 0]);
      return {
        address: utxo.address,
        txid: utxo.txid,
        vout: utxo.outputIndex,
        scriptPubKey: utxo.script,
        amount: utxo.satoshis / 1e8,
        satoshis: utxo.satoshis,
        isStake: !!utxo.isStake,
        height: utxo.height,
        confirmations: utxo.height > 0 ? Math.max(0, tipHeight - utxo.height + 1) : 0,
        rawtx,
      };
    });
    return Promise.all(utxoPromises);
  };

  public sendRawTx = async (rawtx: string): Promise<Insight.ISendRawTxResult> => {
    const txid = await this.rpcCall('sendrawtransaction', [rawtx]);
    return { txid };
  };

  public contractCall = async (address: string, encodedData: string): Promise<Insight.IContractCall> => {
    // The daemon's own `callcontract` RPC already returns {address, executionResult} --
    // the same shape Insight's REST API itself is presumably just proxying.
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
    return this.buildTransactionInfo(id);
  };

  public getTransactions = async (address: string, pageNum = 0): Promise<Insight.IRawTransactions> => {
    const pageSize = 10;
    const allTxids: string[] = await this.rpcCall('getaddresstxids', [{ addresses: [address] }]);
    // getaddresstxids is typically oldest-first; show newest-first to match explorer UX.
    const orderedTxids = [...(allTxids || [])].reverse();
    const pageTxids = orderedTxids.slice(pageNum * pageSize, (pageNum + 1) * pageSize);

    const txs = await Promise.all(pageTxids.map((txid) => this.buildTransactionInfo(txid)));

    return {
      pagesTotal: Math.ceil((allTxids || []).length / pageSize),
      txs,
    };
  };

  /*
  * Naive N+1 implementation: resolves each input's source address with a separate RPC call, and
  * fetches contract receipts best-effort. Fine for a handful of transactions on a dev/RegTest
  * node; not optimized for a busy chain.
  */
  private buildTransactionInfo = async (txid: string): Promise<Insight.IRawTransactionInfo> => {
    const tx = await this.rpcCall('getrawtransaction', [txid, 1]);

    const vinPromises: Promise<Insight.IVin>[] = (tx.vin || []).map(async (input: any) => {
      if (!input.txid) {
        // Coinbase/coinstake input -- no previous output to resolve.
        return { txid: input.txid, addr: '' };
      }
      try {
        const prevTx = await this.rpcCall('getrawtransaction', [input.txid, 1]);
        const prevOut = prevTx.vout[input.vout];
        const addr = (prevOut.scriptPubKey.addresses && prevOut.scriptPubKey.addresses[0])
          || prevOut.scriptPubKey.address || '';
        return { txid: input.txid, addr };
      } catch (err) {
        return { txid: input.txid, addr: '' };
      }
    });
    const vin = await Promise.all(vinPromises);

    const vout = (tx.vout || []).map((output: any) => ({
      // Insight's own vout.value convention is satoshi (not the Core RPC's decimal MRX) --
      // see transactionController.ts's `amount / 1E8` handling.
      value: String(Math.round(output.value * 1e8)),
      scriptPubKey: {
        addresses: output.scriptPubKey.addresses || (output.scriptPubKey.address ? [output.scriptPubKey.address] : []),
      },
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
      valueIn: 0, // Not resolved -- unused by this app's own UI (see transactionController.ts).
      fees: 0, // Not resolved -- unused by this app's own UI.
      blockhash: tx.blockhash || '',
      blockheight: 0, // Not resolved without an extra getblock call -- unused by this app's own UI.
      isqrc20Transfer: receipt.length > 0,
    };
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

    if (!response.ok) {
      throw new Error(`RPC ${method} failed: HTTP ${response.status}`);
    }

    const body = await response.json();
    if (body.error) {
      throw new Error(`RPC ${method} failed: ${body.error.message || JSON.stringify(body.error)}`);
    }
    return body.result;
  };
}
