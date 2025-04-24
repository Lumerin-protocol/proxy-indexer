// @ts-check

import { Contract, CONTRACT_STATE, ContractState, ContractHistory } from "../types/contracts.js";

/**
 * In-memory indexer(cache) for contracts that keeps track block and time of the last update
 */
export class ContractsInMemoryIndexer {
  contracts: Record<string, Contract>;
  lastSyncedContractBlock: number;
  lastSyncedTime: number;

  constructor() {
    this.contracts = {};
    this.lastSyncedContractBlock = 0;
    this.lastSyncedTime = 0;
  }

  async upsert(contract: Contract, blockNumber: number) {
    this.contracts[contract.id] = contract;
    this.#setLastSyncedContractBlock(blockNumber);
  }

  async getAll(filterHistoryByAddr?: string) {
    const contracts = this.#getAll();
    if (!filterHistoryByAddr) {
      return contracts;
    }
    return contracts.map((contract) => {
      contract.history = this.#filterHistoryByWalletAddr(contract.history, filterHistoryByAddr);
      return contract;
    });
  }

  async get(id: string, filterHistoryByAddr?: string): Promise<Contract | null> {
    const contract = this.#getOne(id);
    if (!contract) return null;

    if (!filterHistoryByAddr) {
      return contract;
    }

    contract.history = this.#filterHistoryByWalletAddr(contract.history, filterHistoryByAddr);
    return contract;
  }

  #setLastSyncedContractBlock(blockNumber: number | string) {
    this.lastSyncedContractBlock = Number(blockNumber);
    this.lastSyncedTime = Date.now();
  }

  #filterHistoryByWalletAddr(history: ContractHistory[], walletAddr: string) {
    return history.filter((h) => h.buyer.toLowerCase() === walletAddr.toLowerCase());
  }

  #filterActiveContractFromHistory(history: ContractHistory[]): ContractHistory[] {
    return history.filter((h) => {
      return +h.endTime * 1000 < Date.now();
    });
  }

  #getOne(id: string): Contract | null {
    const contract = this.contracts[id.toLowerCase()];
    if (!contract) {
      return null;
    }

    const result = JSON.parse(JSON.stringify(contract));
    result.state = this.#getContractState(contract);
    result.history = this.#filterActiveContractFromHistory(result.history);
    return result;
  }

  #getAll(): Contract[] {
    const ids = Object.keys(this.contracts);
    return ids.map((id) => {
      return this.#getOne(id) as Contract;
    });
  }

  #getContractState(contract: Contract): ContractState {
    const expirationTime = (+contract.startingBlockTimestamp + +contract.length) * 1000;
    if (expirationTime < Date.now()) {
      return CONTRACT_STATE.Available;
    }
    return CONTRACT_STATE.Running;
  }
}
