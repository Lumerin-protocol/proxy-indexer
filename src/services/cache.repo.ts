import { HashrateContract } from "../types/hashrate-contract.js";

/**
 * In-memory indexer(cache) for contracts that keeps track block and time of the last update
 */
export class Cache {
  contracts: Record<string, HashrateContract> = {};
  lastSyncedContractBlock: number = 0;
  lastSyncedTime: number = 0;
  feeRate: FeeRate = { value: 0n, decimals: 0n };

  constructor() {}

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

  getFeeRate(): FeeRate {
    return {
      value: this.feeRate.value,
      decimals: this.feeRate.decimals,
    };
  }

  setFeeRate(param: FeeRate) {
    this.feeRate = {
      value: param.value,
      decimals: param.decimals,
    };
  }

  #setLastSyncedContractBlock(blockNumber: number | string) {
    this.lastSyncedContractBlock = Number(blockNumber);
    this.lastSyncedTime = Date.now();
  }
}

export type FeeRate = {
  value: bigint;
  decimals: bigint;
};
