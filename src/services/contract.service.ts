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
    await Promise.all(contracts.map((c) => this.#adjustContract(c, filterHistoryByAddr)));
    return contracts;
  }

  async get(id: string, filterHistoryByAddr?: string): Promise<HashrateContract | null> {
    const contract = this.indexer.get(id);
    if (!contract) {
      return null;
    }

    await this.#adjustContract(contract, filterHistoryByAddr);
    return contract;
  }

  async #adjustContract(contract: HashrateContract, filterHistoryByAddr?: string) {
    contract.price = await this.#calculatePrice(contract).then((price) => price.toString());
    contract.state = this.#getContractState(contract);

    if (filterHistoryByAddr) {
      contract.history = this.#filterHistoryByWalletAddr(contract.history, filterHistoryByAddr);
    }
    contract.history = this.#filterActiveContractFromHistory(contract.history);
  }

  async #calculatePrice(contract: HashrateContract) {
    const totalHashrateInTH = BigInt(contract.speed) * BigInt(contract.length);
    const price = await this.priceCalculator.calculatePrice(
      totalHashrateInTH,
      BigInt(contract.profitTarget)
    );
    return price;
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
