"use strict";

const Web3 = require("web3").default;
const { CloneFactory } = require("contracts-js");

const config = require("../../config");
const { ContractsInMemoryIndexer } = require("../../ContractsInMemoryIndexer");
const { ContractsLoader } = require("../../ContractsLoader");
const { ContractMapper } = require("../../ContractMapper");

module.exports = async function (fastify, opts) {
  const web3 = new Web3(config.ETH_NODE_URL);
  const cloneFactory = CloneFactory(web3, config.CLONE_FACTORY_ADDRESS);

  const indexer = ContractsInMemoryIndexer.getInstance(new ContractMapper());
  const loader = new ContractsLoader(web3, cloneFactory);

  fastify.get("/reloadContracts", async function (request, reply) {
    const apiKey = request.query.apiKey;
    if (apiKey !== config.ADMIN_API_KEY) {
      return fastify.httpErrors.unauthorized();
    }
    await loader.loadAll((contractId, contract, _, blockNumber) => {
      indexer.upsert(contractId, contract, blockNumber);
    });
    return indexer.getAll();
  });
};
