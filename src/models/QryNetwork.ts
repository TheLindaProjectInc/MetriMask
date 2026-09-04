import { Network as MjswNetwork } from 'metrixjs-wallet';

import { IRpcConnectionConfig } from './RpcInsightAdapter';

export type NetworkDataSourceMode = 'explorer' | 'rpc';

export default class QryNetwork {
  public name: string;
  public network: MjswNetwork;
  public explorerUrl: string;
  public dataSourceMode: NetworkDataSourceMode = 'explorer';
  public rpcConfig?: IRpcConnectionConfig;

  constructor(name: string, network: MjswNetwork, explorerUrl: string) {
    this.name = name;
    this.network = network;
    this.explorerUrl = explorerUrl;
  }
}
