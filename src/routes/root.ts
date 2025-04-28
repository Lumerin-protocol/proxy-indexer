import { ContractsLoader } from "../services/blockchain.repo";
import { Config } from "../config/env";
import { ContractService } from "../services/contract.service";
import { ContractsInMemoryIndexer } from "../services/cache.repo";
import { ServerType } from "../server";
import { Type } from "@sinclair/typebox";

export async function router(
  fastify: ServerType,
  config: Config,
  service: ContractService,
  indexer: ContractsInMemoryIndexer,
  loader: ContractsLoader
) {
  fastify.get(
    "/admin/reloadContracts",
    {
      schema: {
        querystring: Type.Object({
          apiKey: Type.String(),
        }),
      },
    },
    async function (request) {
      if (request.query.apiKey !== config.ADMIN_API_KEY) {
        return fastify.httpErrors.unauthorized();
      }
      // TODO: stop indexer job and start it again
      const all = await loader.loadAll();
      for (const contract of all.contracts) {
        indexer.upsert(contract, Number(all.blockNumber));
      }
      return indexer.getAll();
    }
  );

  fastify.get(
    "/contracts",
    {
      schema: {
        querystring: Type.Object({
          walletAddr: Type.Optional(Type.String()),
        }),
      },
    },
    async function (request) {
      const { walletAddr } = request.query;
      return service.getAll(walletAddr);
    }
  );

  fastify.get(
    "/contracts/:id",
    {
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        querystring: Type.Object({
          walletAddr: Type.Optional(Type.String()),
        }),
      },
    },
    async function (request) {
      const contract = await service.get(request.params.id, request.query.walletAddr);
      if (!contract) {
        return fastify.httpErrors.notFound("Contract not found");
      }
      return contract;
    }
  );

  fastify.get("/healthcheck", async function () {
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
