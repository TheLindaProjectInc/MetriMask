import { observable, computed } from 'mobx';

export default class Transaction {
  @observable public id?: string;
  @observable public timestamp?: string;
  @observable public confirmations = 0;
  @observable public amount = 0;
  @computed public get pending() {
    return !this.confirmations;
  }
  @observable public direction: string;

  constructor(attributes = {}) {
    Object.assign(this, attributes);
  }
}
