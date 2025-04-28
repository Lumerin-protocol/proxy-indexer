import { PublicClient } from "viem";
import { ContractsLoader } from "./services/blockchain.repo";
import { ContractsInMemoryIndexer } from "./services/cache.repo";
import { startWatchPromise } from "./services/listener";
import { HashrateContract } from "./types/hashrate-contract";
import { FastifyBaseLogger } from "fastify";

export const start = async (
  client: PublicClient,
  loader: ContractsLoader,
  indexer: ContractsInMemoryIndexer,
  log: FastifyBaseLogger
) => {
  log.info("Initial load of contracts");

  const res = await loader.loadAll();
  log.info("Loaded contracts", res.contracts.length);

  for (const contract of res.contracts) {
    await updateContract(contract, Number(res.blockNumber), indexer, log);
  }

  await startWatchPromise(client, {
    initialContractsToWatch: new Set(res.contracts.map((c) => c.id)),
    onContractUpdate: async (contractAddr: string, blockNumber: number) => {
      const contract = await loader.getContract(contractAddr as `0x${string}`);
      await updateContract(contract, blockNumber, indexer, log);
    },
    log,
  });
};

async function updateContract(
  contract: HashrateContract,
  blockNumber: number,
  indexer: ContractsInMemoryIndexer,
  log: FastifyBaseLogger
) {
  indexer.upsert(contract, blockNumber);
  log.info("Updated contract in cache", contract.id);
}
