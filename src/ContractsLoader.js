// @ts-check
const { Implementation } = require("contracts-js");
const { default: Web3 } = require("web3");

class ContractsLoader {
  /**
   *
   * @param {Web3} web3
   * @param {import("contracts-js").CloneFactoryContext} cloneFactory
   */
  constructor(web3, cloneFactory) {
    this.web3 = web3;
    this.cloneFactory = cloneFactory;
  }

  /**
   * Loads all contracts and stores them in the indexer
   *
   * @param {(id: string, contract: RawContract, implInstance: import("contracts-js").ImplementationContext, blockNumber: number) => void} onLoad
   * @returns {Promise<RawContract[]>}
   */
  async loadAll(onLoad) {
    const blockNumber = await this.web3.eth.getBlockNumber();
    const contracts = await this.getContractList();
    return await Promise.all(
      contracts.map(async (contractId) => {
        const contract = await this.getContract(contractId);
        if (typeof onLoad === "function") {
          onLoad(
            contractId,
            contract,
            Implementation(this.web3, contractId),
            Number(blockNumber)
          );
        }
        return contract;
      })
    );
  }

  /**
   *
   * @returns {Promise<string[]>}
   */
  async getContractList() {
    return await this.cloneFactory.methods.getContractList().call();
  }

  /**
   *
   * @param {string} contractId
   * @returns {Promise<RawContract>}
   */
  async getContract(contractId) {
    const impl = Implementation(this.web3, contractId);
    const data = await impl.methods.getPublicVariablesV2().call();

    let futureTerms = undefined;
    if (data._hasFutureTerms) {
      futureTerms = await impl.methods.futureTerms().call();
    }
    const history = await impl.methods.getHistory("0", "100").call();
    const stats = await impl.methods.getStats().call();
    return { data, futureTerms, history, stats };
  }
}

module.exports = { ContractsLoader };
