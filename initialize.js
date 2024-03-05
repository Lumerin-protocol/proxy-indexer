const { Web3 } = require("web3");
const { CloneFactory } = require("contracts-js");

const { ContractsLoader } = require("./src/ContractsLoader");
const { ContractsInMemoryIndexer } = require("./src/ContractsInMemoryIndexer");
const { ContractMapper } = require("./src/ContractMapper");
const { ContractEventsListener } = require("./src/ContractEventsListener");

const web3 = new Web3(process.env.WS_ETH_NODE_URL);
const cloneFactory = CloneFactory(web3, process.env.CLONE_FACTORY_ADDRESS);

const indexer = ContractsInMemoryIndexer.getInstance(new ContractMapper());
const loader = new ContractsLoader(web3, cloneFactory);

const initialize = async (config) => {
  /**
   *
   * @param {string} contractId
   */
  const onEventUpdate = async (contractId) => {
    try {
      const contract = await loader.getContract(contractId);
      indexer.upsert(contractId, contract);
    } catch (error) {
      console.error("Error updating contract", contractId, error);
    }
  };

  const eventsListener = ContractEventsListener.create(
    cloneFactory,
    onEventUpdate
  );

  /**
   *
   * @param {string} contractId
   * @param {Contract} contract
   * @param {import("contracts-js").ImplementationContext} implInstance
   */
  const onContractLoad = (contractId, contract, implInstance) => {
    indexer.upsert(contractId, contract);
    eventsListener.listenContract(contractId, implInstance);
  };

  await loader.loadAll(onContractLoad);
  console.log("All Contracts loaded");
};

module.exports = { initialize };
