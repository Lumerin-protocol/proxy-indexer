// @ts-check

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
    if (!walletAddr) {
      return this.contracts[id.toLowerCase()];
    }

    const contract = this.#getOne(id);
    if (!contract) return null;

    contract.history = this.#filterHistoryByWalletAddr(
      contract.history,
      walletAddr
    );
    return contract;
  }

  #setLastSyncedContractBlock(blockNumber) {
    this.lastSyncedContractBlock = blockNumber;
    this.lastSyncedTime = Date.now();
  }

  #filterHistoryByWalletAddr(history, walletAddr) {
    return history.filter(
      (h) => h.buyer.toLowerCase() === walletAddr.toLowerCase()
    );
  }

  #getOne(id) {
    const contract = this.contracts[id.toLowerCase()];
    if (contract) {
      return JSON.parse(JSON.stringify(contract));
    }
    return null;
  }

  #getAll() {
    return JSON.parse(JSON.stringify(Object.values(this.contracts)));
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
