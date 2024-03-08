const { Web3 } = require("web3");
const Web3WsProvider = require("web3-providers-ws").default;
const { createPublicClient, webSocket, parseAbi } = require("viem");

const { CloneFactory } = require("contracts-js");

const { ContractsLoader } = require("./src/ContractsLoader");
const { ContractsInMemoryIndexer } = require("./src/ContractsInMemoryIndexer");
const { ContractMapper } = require("./src/ContractMapper");

/**
 *
 * @param {import('viem').PublicClient} client
 * @param {any} loader
 * @param {any} config
 * @param {(id, blockNumber) => void} onLogUpdate
 * @returns {Promise<void>}
 */
const startWatch = async (client, loader, config, onLogUpdate) => {
  try {
    const contractAddresses = await loader.getContractList();
    const addresses = [config.CLONE_FACTORY_ADDRESS, ...contractAddresses];
  
    const cloneFactoryEvents = [
      "contractCreated",
      "clonefactoryContractPurchased",
      "contractDeleteUpdated",
      "purchaseInfoUpdated",
    ];
    const eventsAbi = [
      // Clone Factory Events
      "event contractCreated(address indexed _address, string _pubkey)",
      "event clonefactoryContractPurchased(address indexed _address)",
      "event contractDeleteUpdated(address _address, bool _isDeleted)",
      "event purchaseInfoUpdated(address indexed _address)",
  
      // Implementation Events
      "event contractClosed(address indexed _buyer)",
      "event cipherTextUpdated(string newCipherText)",
      "event destinationUpdated(string newValidatorURL, string newDestURL)",
    ];
  
    const unwatch = client.watchEvent({
      address: addresses,
      events: parseAbi(eventsAbi),
      poll: true,
      pollingInterval: 1000,
      onLogs: (logs) => {
        console.log(`Received logs: ${logs.length}`);
        logs.forEach((log) => {
          const { eventName, args, address, blockNumber } = log;
          let contractAddress = null;
          if (cloneFactoryEvents.includes(eventName)) {
            contractAddress = args._address;
          } else {
            contractAddress = address;
          }
          console.log(`Received log for contract: ${contractAddress}`);
  
          onLogUpdate(contractAddress, Number(blockNumber));
          if (eventName === "contractCreated") {
            console.log('Got contract created event, restating watch')
            unwatch();
            startWatch(client, loader, config, onLogUpdate);
          }
        });
      },
      onError: (error) => {
        console.error("On Error Callback", error);
      }
    });
    console.log(
      `Started listen events for contracts: ${JSON.stringify(addresses)}, amount: ${addresses.length}`
    );
    return { addresses };
  } catch (err) {
    console.error("Error starting watch", err);
    process.exit(1);
  }
};

const initialize = async (config) => {
  const client = createPublicClient({
    transport: webSocket(config.WS_ETH_NODE_URL),
  });

  const ws = new Web3WsProvider(
    config.WS_ETH_NODE_URL,
    {},
    {
      autoReconnect: true,
      delay: 1000,
      maxAttempts: 10,
    }
  );
  const web3 = new Web3(ws);

  ws.on("disconnect", () => {
    console.log("ws provider disconnected (disconnect event)");
    process.exit(1);
  });
  ws.on("error", (error) => {
    console.error("ws provider error", error);
  });
  ws.on("end", (d) => {
    console.log("ws provider disconnected (end event)");
    process.exit(1);
  });

  const cloneFactory = CloneFactory(web3, config.CLONE_FACTORY_ADDRESS);

  const indexer = ContractsInMemoryIndexer.getInstance(new ContractMapper());
  const loader = new ContractsLoader(web3, cloneFactory);

  /**
   *
   * @param {string} contractId
   * @param {number} blockNumber
   */
  const onEventUpdate = async (contractId, blockNumber) => {
    try {
      const contract = await loader.getContract(contractId);
      indexer.upsert(contractId, contract, blockNumber);
    } catch (error) {
      console.error("Error updating contract", contractId, error);
    }
  };

  /**
   *
   * @param {string} contractId
   * @param {Contract} contract
   * @param {import("contracts-js").ImplementationContext} implInstance
   * @param {number} blockNumber
   */
  const onContractLoad = (contractId, contract, implInstance, blockNumber) => {
    indexer.upsert(contractId, contract, blockNumber);
  };

  await startWatch(client, loader, config, onEventUpdate);

  await loader.loadAll(onContractLoad);
  console.log("All Contracts loaded");
};

module.exports = { initialize };
