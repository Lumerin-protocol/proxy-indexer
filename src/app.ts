import { ContractsLoader } from "./services/blockchain.repo";
import { ContractsInMemoryIndexer } from "./services/cache.repo";
import { config } from "./config/env";
import { http } from "viem";
import { createPublicClient } from "viem";
import * as indexerJob from "./indexer-job";
import { Server } from "./server";
import { arbitrum, arbitrumSepolia, hardhat } from "viem/chains";
import { Chain } from "viem";
import { ContractService } from "./services/contract.service";
import { PriceCalculator } from "./services/price-calculator";

const chains: Record<number, Chain> = {
  [hardhat.id]: hardhat,
  [arbitrumSepolia.id]: arbitrumSepolia,
  [arbitrum.id]: arbitrum,
};

async function main() {
  const client0 = createPublicClient({
    transport: http(config.ETH_NODE_URL),
  });

  console.log("Connecting to blockchain...");

  const chainId = await client0.getChainId();
  let chain = chains[chainId];
  if (!chain) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  console.log("Chain ID", chainId);

  if (config.MULTICALL_ADDRESS) {
    chain.contracts = {
      ...chain.contracts,
      multicall3: { address: config.MULTICALL_ADDRESS as `0x${string}` },
    };
  }

  const client = createPublicClient({
    transport: http(config.ETH_NODE_URL, {
      retryCount: 10,
      retryDelay: 1000,
    }),
    chain,
  });

  const loader = new ContractsLoader(client, config.CLONE_FACTORY_ADDRESS);
  const indexer = new ContractsInMemoryIndexer();
  const service = new ContractService(
    indexer,
    new PriceCalculator(
      client,
      config.HASHRATE_ORACLE_ADDRESS as `0x${string}`,
      config.CLONE_FACTORY_ADDRESS as `0x${string}`
    )
  );

  const server = new Server(indexer, loader, service);
  const log = server.getLogger();
  log.info(`Starting app with config: ${JSON.stringify(config)}`);

  // TODO: split into multiple phases
  await Promise.all([
    indexerJob.start(client, loader, indexer, log.child({ module: "indexerJob" })),
    server.start(),
  ]);
}

main();
