import { createPublicClient, http, getContract } from "viem";

import { abi } from "contracts-js";

import { ContractsLoader } from "./services/blockchain.repo";
import { ContractsInMemoryIndexer } from "./services/cache.repo";
import { Config } from "./config/config";
import { startWatchPromise } from "./services/listener";

export const start = async (
  config: Config,
  loader: ContractsLoader,
  indexer: ContractsInMemoryIndexer
) => {
  const client = createPublicClient({
    transport: http(config.ETH_NODE_URL, {
      retryCount: 10,
      retryDelay: 1000,
    }),
  });

  console.log("Initial load of contracts");
  const res = await loader.loadAll();
  console.log("Loaded contracts", res.contracts.length);

  for (const contract of res.contracts) {
    // fix this upsert function
    if (!contract) {
      console.log("Contract is undefined", contract);
      throw new Error("Contract is undefined");
    }
    indexer.upsert(contract, Number(res.blockNumber));
  }

  await startWatchPromise(client, {
    initialContractsToWatch: new Set(res.contracts.map((c) => c.id)),
    onContractUpdate: async (contractAddr: string, blockNumber: number) => {
      const contract = await loader.getContract(contractAddr as `0x${string}`);
      indexer.upsert(contract, blockNumber);
    },
  });
};
