import type { FastifyBaseLogger } from "fastify";
import type { PublicClient } from "viem";
import type { ContractsLoader } from "./services/blockchain.repo";
import type { Cache } from "./services/cache.repo";
import { startWatchPromise } from "./services/listener";
import type { HashrateContract } from "./types/hashrate-contract";

export const start = async (client: PublicClient, loader: ContractsLoader, indexer: Cache, log: FastifyBaseLogger) => {
  log.info("Initial load of contracts");

  const res = await loader.loadAll();
  log.info("Loaded contracts", res.contracts.length);

  for (const contract of res.contracts) {
    updateContract(contract, Number(res.blockNumber), indexer, log);
  }

  await startWatchPromise(client, {
    initialContractsToWatch: new Set(res.contracts.map((c) => c.id)),
    onContractUpdate: async (contractAddr: string, blockNumber: number) => {
      const contract = await loader.getContract(contractAddr as `0x${string}`);
      updateContract(contract, blockNumber, indexer, log);
    },
    onFeeUpdate: async (feeRateScaled: bigint) => {
      const decimals = await loader.cloneFactory.read.VALIDATOR_FEE_DECIMALS();
      log.info("Fee rate updated", { feeRateScaled, decimals });
      indexer.setFeeRate({ value: feeRateScaled, decimals: BigInt(decimals) });
    },
    log,
  });
};

function updateContract(contract: HashrateContract, blockNumber: number, cache: Cache, log: FastifyBaseLogger) {
  cache.upsert(contract, blockNumber);
  cache.setValidatorHistory(contract.id as `0x${string}`, contract.history);
  log.info(`Contract ${contract.id} updated in cache`);
}
