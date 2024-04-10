// @ts-check

const CONTRACT_STATE = {
  Available: "0",
  Running: "1",
};

class ContractsInMemoryIndexer {
  /**
   * @type {ContractsInMemoryIndexer}
   */
  static instance;

  /**
   *
   * @param {import('./ContractMapper').ContractMapper} mapper
   */
  constructor(mapper) {
    this.mapper = mapper;
    this.contracts = {};
    this.lastSyncedContractBlock = 0;
    this.lastSyncedTime = 0;
  }

  /**
   *
   * @param {string} contractId
   * @param {RawContract} rawContract
   * @param {number} blockNumber
   */
  async upsert(contractId, rawContract, blockNumber) {
    const id = contractId.toLowerCase();
    const contract = this.mapper.map(id, rawContract);
    this.contracts[id] = contract;
    this.#setLastSyncedContractBlock(blockNumber);
  }

  /**
   * @param {string} [walletAddr]
   * @returns {Promise<Contract[]>}
   */
  async getAll(walletAddr) {
    const contracts = this.#getAll();
    if (!walletAddr) {
      return contracts;
    }
    return contracts.map((contract) => {
      contract.history = this.#filterHistoryByWalletAddr(
        contract.history,
        walletAddr
      );
      return contract;
    });
  }

  /**
   *
   * @param {string} id
   * @param {string} [walletAddr]
   * @returns {Promise<Contract|null>}
   */
  async get(id, walletAddr) {
    const contract = this.#getOne(id);
    if (!contract) return null;

    if (!walletAddr) {
      return contract;
    }

    contract.history = this.#filterHistoryByWalletAddr(
      contract.history,
      walletAddr
    );
    return contract;
  }

  #setLastSyncedContractBlock(blockNumber) {
    this.lastSyncedContractBlock = Number(blockNumber);
    this.lastSyncedTime = Date.now();
  }

  #filterHistoryByWalletAddr(history, walletAddr) {
    return history.filter(
      (h) => h.buyer.toLowerCase() === walletAddr.toLowerCase()
    );
  }

  /**
   * 
   * @param {ContractHistory[]} history 
   * @returns 
   */
  #filterActiveContractFromHistory(history) {
    return history.filter((h) => {
      return +h.endTime * 1000 < Date.now();
    });
  }

  #getOne(id) {
    const contract = this.contracts[id.toLowerCase()];
    if (!contract) {
      return null;
    }

    const result = JSON.parse(JSON.stringify(contract));
    result.state = this.#getContractState(contract);
    result.history = this.#filterActiveContractFromHistory(result.history);
    return result;
  }

  #getAll() {
    const ids = Object.keys(this.contracts);
    return ids.map((id) => {
      return this.#getOne(id);
    });
  }

  /**
   *
   * @param {Contract} contract
   */
  #getContractState(contract) {
    const expirationTime =
      (+contract.startingBlockTimestamp + +contract.length) * 1000;
    if (expirationTime < Date.now()) {
      return CONTRACT_STATE.Available;
    }
    return CONTRACT_STATE.Running;
  }

  /**
   *
   * @param {import('./ContractMapper').ContractMapper} mapper
   * @returns
   */
  static getInstance(mapper) {
    if (!ContractsInMemoryIndexer.instance) {
      ContractsInMemoryIndexer.instance = new ContractsInMemoryIndexer(mapper);
    }

    return ContractsInMemoryIndexer.instance;
  }
}

module.exports = {
  ContractsInMemoryIndexer,
};
