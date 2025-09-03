import {
  CONTRACT_STATE,
  type ContractHistory,
  type ContractState,
  type HashrateContract,
} from "../types/hashrate-contract";
import type { Cache } from "./cache.repo";
import type { GetResponse } from "./contract.service.types";
import type { PriceCalculator } from "./price-calculator";

/** Service for managing hashrate contracts. Adds price calculation and optional filtering history by wallet address */
export class ContractService {
  constructor(
    private readonly indexer: Cache,
    private readonly priceCalculator: PriceCalculator,
  ) {}

  async getAll(filterHistoryByAddr?: string): Promise<GetResponse<HashrateContract[]>> {
    const contracts = this.indexer.getAll();
    const data = await Promise.all(contracts.map((c) => this.#adjustContract(c, filterHistoryByAddr)));
    return {
      data,
      blockNumber: this.indexer.lastSyncedContractBlock,
    };
  }

  async get(id: string, filterHistoryByAddr?: string): Promise<GetResponse<HashrateContract | null>> {
    const contract = this.indexer.get(id);
    const data = contract && (await this.#adjustContract(contract, filterHistoryByAddr));

    return {
      data,
      blockNumber: this.indexer.lastSyncedContractBlock,
    };
  }

  async getValidatorHistory(validatorAddr: string): Promise<GetResponse<ValidatorHistoryEntry[]>> {
    const history = this.indexer.getValidatorHistory(validatorAddr as `0x${string}`);

    return {
      data: history,
      blockNumber: this.indexer.lastSyncedContractBlock,
    };
  }

  async #adjustContract(contract: HashrateContract, filterHistoryByAddr?: string): Promise<HashrateContract> {
    const { price, fee } = await this.#calculatePriceAndFee(contract);

    return {
      ...contract,
      price: price.toString(),
      fee: fee.toString(),
      state: this.#getContractState(contract),
      history: this.#filterHistory(contract.history, filterHistoryByAddr),
    };
  }

  #filterHistory(history: ContractHistory[], filterHistoryByAddr?: string) {
    let historyCopy = [...history];
    if (filterHistoryByAddr) {
      historyCopy = this.#filterHistoryByWalletAddr(historyCopy, filterHistoryByAddr);
    }
    return historyCopy;
  }

  async #calculatePriceAndFee(contract: HashrateContract) {
    const totalHashes = BigInt(contract.speed) * BigInt(contract.length);
    const { price, fee } = await this.priceCalculator.calculatePriceAndFee(totalHashes, BigInt(contract.profitTarget));
    return { price, fee };
  }

  #filterHistoryByWalletAddr(history: ContractHistory[], walletAddr: string) {
    return history.filter((h) => h.buyer.toLowerCase() === walletAddr.toLowerCase());
  }

  #getContractState(contract: HashrateContract): ContractState {
    const expirationTime = (+contract.startingBlockTimestamp + +contract.length) * 1000;
    if (expirationTime < Date.now()) {
      return CONTRACT_STATE.Available;
    }
    return CONTRACT_STATE.Running;
  }
}
