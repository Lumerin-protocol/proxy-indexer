import { ContractsLoader } from "./services/blockchain.repo";
import { Cache } from "./services/cache.repo";
import { config } from "./config/env";
import { http } from "viem";
import { createPublicClient } from "viem";
import * as indexerJob from "./indexer-job";
import { Server } from "./server";
import { arbitrum, arbitrumSepolia, hardhat } from "viem/chains";
import { Chain } from "viem";
import { ContractService } from "./services/contract.service";
import { PriceCalculator } from "./services/price-calculator";
import pino from "pino";

const chains: Record<number, Chain> = {
  [hardhat.id]: hardhat,
  [arbitrumSepolia.id]: arbitrumSepolia,
  [arbitrum.id]: arbitrum,
};

async function main() {
  const client0 = createPublicClient({
    transport: http(config.ETH_NODE_URL),
  });

  const log = pino({
    level: config.LOG_LEVEL,
  });

  log.info("Connecting to blockchain...");

  const chainId = await client0.getChainId();
  let chain = chains[chainId];
  if (!chain) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  log.info("Chain ID", chainId);

  if (config.MULTICALL_ADDRESS) {
    log.info("Using custom multicall address", config.MULTICALL_ADDRESS);
    chain.contracts = {
      ...chain.contracts,
      multicall3: { address: config.MULTICALL_ADDRESS as `0x${string}` },
    };
    log.info("Multicall address", config.MULTICALL_ADDRESS);
  }

  const ethClientLogger = log.child({ module: "ethClient" });
  const client = createPublicClient({
    transport: http(config.ETH_NODE_URL, {
      retryCount: 5,
      retryDelay: 200,
      onFetchRequest: async (request) => {
        ethClientLogger.debug("requesting blockchain: %s", await request.json());
      },
    }),
    chain,
  });

  const loader = new ContractsLoader(client, config.CLONE_FACTORY_ADDRESS);
  const feeRate = await loader.getFeeRate();
  const cache = new Cache();
  cache.setFeeRate(feeRate);

  const service = new ContractService(
    cache,
    new PriceCalculator(
      client,
      config.HASHRATE_ORACLE_ADDRESS as `0x${string}`,
      cache,
      log.child({ module: "priceCalculator" })
    )
  );

  const server = new Server(cache, loader, service, log.child({ module: "server" }));
  log.info(`Starting app with config: ${JSON.stringify(config)}`);

  // TODO: split into multiple phases
  await Promise.all([
    indexerJob.start(client, loader, cache, log.child({ module: "indexerJob" })),
    server.start(),
  ]);
}

main();
