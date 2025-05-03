import {
  HashrateContract,
  CONTRACT_STATE,
  ContractHistory,
  ContractState,
} from "../types/hashrate-contract";
import { ContractsInMemoryIndexer } from "./cache.repo";
import { PriceCalculator } from "./price-calculator";

/** Service for managing hashrate contracts. Adds price calculation and optional filtering history by wallet address */
export class ContractService {
  constructor(
    private readonly indexer: ContractsInMemoryIndexer,
    private readonly priceCalculator: PriceCalculator
  ) {}

  async getAll(filterHistoryByAddr?: string): Promise<HashrateContract[]> {
    const contracts = this.indexer.getAll();
    return Promise.all(contracts.map((c) => this.#adjustContract(c, filterHistoryByAddr)));
  }

  async get(id: string, filterHistoryByAddr?: string): Promise<HashrateContract | null> {
    const contract = this.indexer.get(id);
    if (!contract) {
      return null;
    }

    return await this.#adjustContract(contract, filterHistoryByAddr);
  }

  async #adjustContract(
    contract: HashrateContract,
    filterHistoryByAddr?: string
  ): Promise<HashrateContract> {
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
    return this.#filterActiveContractFromHistory(historyCopy);
  }

  async #calculatePriceAndFee(contract: HashrateContract) {
    const totalHashes = BigInt(contract.speed) * BigInt(contract.length);
    const { price, fee } = await this.priceCalculator.calculatePriceAndFee(
      totalHashes,
      BigInt(contract.profitTarget)
    );
    return { price, fee };
  }

  #filterHistoryByWalletAddr(history: ContractHistory[], walletAddr: string) {
    return history.filter((h) => h.buyer.toLowerCase() === walletAddr.toLowerCase());
  }

  #filterActiveContractFromHistory(history: ContractHistory[]): ContractHistory[] {
    return history.filter((h) => {
      return Number(h.endTime) * 1000 < Date.now();
    });
  }

  #getContractState(contract: HashrateContract): ContractState {
    const expirationTime = (+contract.startingBlockTimestamp + +contract.length) * 1000;
    if (expirationTime < Date.now()) {
      return CONTRACT_STATE.Available;
    }
    return CONTRACT_STATE.Running;
  }
}
