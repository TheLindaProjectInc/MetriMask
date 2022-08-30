import { observable } from 'mobx';

export default class MRC721Token {
  @observable public name: string;
  @observable public symbol: string;
  @observable public address: string;
  @observable public balance?: number;

  constructor(name: string, symbol: string, address: string) {
    this.name = name;
    this.symbol = symbol;
    this.address = address;
  }
}
