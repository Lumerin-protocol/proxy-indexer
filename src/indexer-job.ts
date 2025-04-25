import { PublicClient } from "viem";
import { ContractsLoader } from "./services/blockchain.repo";
import { ContractsInMemoryIndexer } from "./services/cache.repo";
import { startWatchPromise } from "./services/listener";
import { HashrateContract } from "./types/hashrate-contract";

export const start = async (
  client: PublicClient,
  loader: ContractsLoader,
  indexer: ContractsInMemoryIndexer
) => {
  console.log("Initial load of contracts");

  const res = await loader.loadAll();
  console.log("Loaded contracts", res.contracts.length);

  for (const contract of res.contracts) {
    await updateContract(contract, Number(res.blockNumber), indexer);
  }

  await startWatchPromise(client, {
    initialContractsToWatch: new Set(res.contracts.map((c) => c.id)),
    onContractUpdate: async (contractAddr: string, blockNumber: number) => {
      const contract = await loader.getContract(contractAddr as `0x${string}`);
      await updateContract(contract, blockNumber, indexer);
    },
  });
};

async function updateContract(
  contract: HashrateContract,
  blockNumber: number,
  indexer: ContractsInMemoryIndexer
) {
  indexer.upsert(contract, blockNumber);
  console.log("Updated contract in cache", contract.id);
}
