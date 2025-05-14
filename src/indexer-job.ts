import { PublicClient } from "viem";
import { ContractsLoader } from "./services/blockchain.repo";
import { Cache } from "./services/cache.repo";
import { startWatchPromise } from "./services/listener";
import { HashrateContract } from "./types/hashrate-contract";
import { FastifyBaseLogger } from "fastify";

export const start = async (
  client: PublicClient,
  loader: ContractsLoader,
  indexer: Cache,
  log: FastifyBaseLogger
) => {
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

function updateContract(
  contract: HashrateContract,
  blockNumber: number,
  indexer: Cache,
  log: FastifyBaseLogger
) {
  indexer.upsert(contract, blockNumber);
  log.info(`Contract ${contract.id} updated in cache`);
}
