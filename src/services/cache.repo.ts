import { HashrateContract } from "../types/hashrate-contract.js";

/**
 * In-memory indexer(cache) for contracts that keeps track block and time of the last update
 */
export class ContractsInMemoryIndexer {
  contracts: Record<string, HashrateContract>;
  lastSyncedContractBlock: number;
  lastSyncedTime: number;

  constructor() {
    this.contracts = {};
    this.lastSyncedContractBlock = 0;
    this.lastSyncedTime = 0;
  }

  get(id: string): HashrateContract | null {
    const contract = this.contracts[id.toLowerCase()];
    if (!contract) {
      return null;
    }

    return contract;
  }

  getAll(): HashrateContract[] {
    const ids = Object.keys(this.contracts);
    return ids.map((id) => {
      return this.get(id)!;
    });
  }

  upsert(contract: HashrateContract, blockNumber: number) {
    this.contracts[contract.id] = contract;
    this.#setLastSyncedContractBlock(blockNumber);
  }

  #setLastSyncedContractBlock(blockNumber: number | string) {
    this.lastSyncedContractBlock = Number(blockNumber);
    this.lastSyncedTime = Date.now();
  }
}
