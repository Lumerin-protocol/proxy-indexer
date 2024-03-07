"use strict";

const { ContractsInMemoryIndexer } = require("../../ContractsInMemoryIndexer");
const config = require("../../config");

module.exports = async function (fastify, opts) {
  const indexer = ContractsInMemoryIndexer.getInstance();

  fastify.get("/", async function (request, reply) {
    return {
      status: "ok",
      version: process.env.npm_package_version,
      cloneFactoryAddress: config.CLONE_FACTORY_ADDRESS,
      lastSyncedContractBlock: Number(indexer.lastSyncedContractBlock),
      lastSyncedTime: Number(indexer.lastSyncedTime),
      lastSyncedTimeISO: new Date(indexer.lastSyncedTime).toISOString(),
    };
  });
};
