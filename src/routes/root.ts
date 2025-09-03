import { Type } from "@sinclair/typebox";
import type { Config } from "../config/env";
import type { ServerType } from "../server";
import type { ContractsLoader } from "../services/blockchain.repo";
import type { Cache } from "../services/cache.repo";
import type { ContractService } from "../services/contract.service";
import packageJson from "../../package.json";

export async function router(
  fastify: ServerType,
  config: Config,
  service: ContractService,
  indexer: Cache,
  loader: ContractsLoader
) {
  const startTime = Date.now();

  fastify.get(
    "/admin/reloadContracts",
    {
      schema: {
        querystring: Type.Object({
          apiKey: Type.String(),
        }),
      },
    },
    async (request) => {
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
    async (request) => {
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
    async (request) => {
      const contract = await service.get(request.params.id, request.query.walletAddr);
      if (!contract) {
        return fastify.httpErrors.notFound("Contract not found");
      }
      return contract;
    }
  );

  fastify.get(
    "/validator/:validatorAddr",
    {
      schema: {
        params: Type.Object({
          validatorAddr: Type.String(),
        }),
      },
    },
    async (request) => {
      const { validatorAddr } = request.params;
      return service.getValidatorHistory(validatorAddr);
    }
  );

  fastify.get("/healthcheck", async () => ({
    status: "ok",
    version: packageJson.version || "unknown",
    uptimeSeconds: (Date.now() - startTime) / 1000,
    cloneFactoryAddress: config.CLONE_FACTORY_ADDRESS,
    lastSyncedContractBlock: Number(indexer.lastSyncedContractBlock),
    lastSyncedTime: Number(indexer.lastSyncedTime),
    lastSyncedTimeISO: new Date(indexer.lastSyncedTime).toISOString(),
  }));
}
