import type { ContractHistory, HashrateContract } from "../types/hashrate-contract.js";

/**
 * In-memory indexer(cache) for contracts that keeps track block and time of the last update
 */
export class Cache {
  contracts: Record<string, HashrateContract> = {};
  lastSyncedContractBlock = 0;
  lastSyncedTime = 0;
  feeRate: FeeRate = { value: 0n, decimals: 0n };
  validatorHistory: Map<string, Map<string, ValidatorHistoryEntry>> = new Map(); // validator -> buyer+purchaseTime -> history

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

  getValidatorHistory(validator: `0x${string}`): ValidatorHistoryEntry[] {
    const res: ValidatorHistoryEntry[] = [];
    const history = this.validatorHistory.get(validator);
    if (!history) {
      return res;
    }
    for (const [_, value] of history.entries()) {
      res.push({ ...value });
    }
    return res;
  }

  validatorHistoryKey(contractAddr: `0x${string}`, purchaseTime: string) {
    return `${contractAddr}-${purchaseTime}`;
  }

  setValidatorHistory(contractAddr: `0x${string}`, history: ContractHistory[]) {
    for (const h of history) {
      let singleValidatorHistory = this.validatorHistory.get(h.validator);
      if (!singleValidatorHistory) {
        singleValidatorHistory = new Map();
        this.validatorHistory.set(h.validator, singleValidatorHistory);
      }

      const key = this.validatorHistoryKey(contractAddr, h.purchaseTime);
      singleValidatorHistory.set(key, {
        buyer: h.buyer as `0x${string}`,
        purchaseTime: h.purchaseTime,
        endTime: h.endTime,
        price: h.price,
        fee: h.fee,
        speed: h.speed,
        length: h.length,
        contract: contractAddr,
      });
    }
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
