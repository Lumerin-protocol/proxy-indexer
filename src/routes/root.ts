import { FastifyInstance } from "fastify";
import { ContractsLoader } from "../services/blockchain.repo";
import { Config } from "../config/config";
import { ContractService } from "../services/contract.service";
import { ContractsInMemoryIndexer } from "../services/cache.repo";

export async function router(
  fastify: FastifyInstance,
  config: Config,
  service: ContractService,
  indexer: ContractsInMemoryIndexer,
  loader: ContractsLoader
) {
  fastify.get("/", async function () {
    return { root: true };
  });

  fastify.get("/admin/reloadContracts", async function (request) {
    const apiKey = request.query.apiKey;
    if (apiKey !== config.ADMIN_API_KEY) {
      return fastify.httpErrors.unauthorized();
    }
    // TODO: stop indexer job and start it again
    const all = await loader.loadAll();
    for (const contract of all.contracts) {
      indexer.upsert(contract, Number(all.blockNumber));
    }
    return indexer.getAll();
  });

  fastify.get("/contracts", async function (request, reply) {
    const { walletAddr } = request.query;
    // TODO: add validation
    return service.getAll(walletAddr);
  });

  fastify.get("/contracts/:id", async function (request, reply) {
    const { params, query } = request;
    const { id } = params;
    const { walletAddr } = query;

    const contract = await service.get(id, walletAddr);
    if (!contract) {
      return fastify.httpErrors.notFound("Contract not found");
    }
    return contract;
  });

  fastify.get("/healthcheck", async function (request, reply) {
    return {
      status: "ok",
      version: process.env.npm_package_version,
      cloneFactoryAddress: config.CLONE_FACTORY_ADDRESS,
      lastSyncedContractBlock: Number(indexer.lastSyncedContractBlock),
      lastSyncedTime: Number(indexer.lastSyncedTime),
      lastSyncedTimeISO: new Date(indexer.lastSyncedTime).toISOString(),
    };
  });
}
