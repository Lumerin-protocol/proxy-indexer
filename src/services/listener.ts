import { abi } from "contracts-js";
import type { FastifyBaseLogger } from "fastify";
import { type PublicClient, getAbiItem, isAddressEqual } from "viem";
import { config } from "../config/env";

const cfAbi = abi.cloneFactoryAbi;
const implAbi = abi.implementationAbi;

/** Alchemy caps eth_getLogs at 2 000 blocks on Arbitrum One; keep a safety margin. */
const MAX_BLOCK_RANGE = 1900n;
const POLL_INTERVAL_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_CONSECUTIVE_ERRORS = 50;

type StartWatchProps = {
  initialContractsToWatch: Set<string>;
  onContractUpdate: (contractAddr: string, blockNumber: number) => void;
  onFeeUpdate: (newFeeRateScaled: bigint) => void;
  onError?: (error: Error) => void;
  blockNumber?: number;
  log: FastifyBaseLogger;
};

const watchedEvents = [
  getAbiItem({ abi: cfAbi, name: "contractCreated" }),
  getAbiItem({ abi: cfAbi, name: "clonefactoryContractPurchased" }),
  getAbiItem({ abi: cfAbi, name: "contractDeleteUpdated" }),
  getAbiItem({ abi: cfAbi, name: "purchaseInfoUpdated" }),
  getAbiItem({ abi: cfAbi, name: "validatorFeeRateUpdated" }),
  getAbiItem({ abi: implAbi, name: "closedEarly" }),
  getAbiItem({ abi: implAbi, name: "destinationUpdated" }),
  getAbiItem({ abi: implAbi, name: "fundsClaimed" }),
];

/**
 * Polls for contract events using bounded eth_getLogs calls instead of
 * eth_newFilter / eth_getFilterChanges.  This avoids the
 * "invalid block range params" error that high-throughput chains like
 * Arbitrum One trigger when the filter falls behind.
 *
 * Transient RPC errors are retried with exponential back-off; only after
 * MAX_CONSECUTIVE_ERRORS failures does the promise reject (causing the
 * ECS task to exit and be restarted by the service).
 */
export async function startWatchPromise(pc: PublicClient, props: StartWatchProps): Promise<never> {
  const contractsToWatch = props.initialContractsToWatch;
  const { log } = props;

  let cursor = props.blockNumber != null ? BigInt(props.blockNumber) : await pc.getBlockNumber();

  let consecutiveErrors = 0;
  log.info({ fromBlock: Number(cursor) }, "Starting bounded getLogs polling");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const head = await pc.getBlockNumber();

      if (head <= cursor) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      while (cursor < head) {
        const from = cursor + 1n;
        const to = from + MAX_BLOCK_RANGE - 1n < head ? from + MAX_BLOCK_RANGE - 1n : head;

        const addresses = [config.CLONE_FACTORY_ADDRESS, ...contractsToWatch] as `0x${string}`[];

        const logs = await pc.getLogs({
          address: addresses,
          events: watchedEvents,
          fromBlock: from,
          toBlock: to,
          strict: true,
        });

        if (logs.length > 0) {
          log.info({ count: logs.length, from: Number(from), to: Number(to) }, "Received logs");
        }

        for (const entry of logs) {
          const { eventName, args, address, blockNumber } = entry;
          log.info(`Received ${eventName} on ${address} with args ${JSON.stringify(args)}`);

          switch (eventName) {
            //
            // contract update emitted on implementation contract
            //
            case "closedEarly":
            case "destinationUpdated":
            case "fundsClaimed":
              props.onContractUpdate(address, Number(blockNumber));
              break;
            //
            // contract update emitted on clonefactory contract
            //
            case "clonefactoryContractPurchased":
            case "contractDeleteUpdated":
              props.onContractUpdate(args._address, Number(blockNumber));
              break;
            case "purchaseInfoUpdated":
              if (isAddressEqual(address, config.CLONE_FACTORY_ADDRESS as `0x${string}`)) {
                props.onContractUpdate(args._address, Number(blockNumber));
              }
              break;
            //
            // new contract — add to watch set for subsequent polls
            //
            case "contractCreated":
              contractsToWatch.add(args._address);
              log.info({ newAddr: args._address }, "New contract — added to watch set");
              props.onContractUpdate(args._address, Number(blockNumber));
              break;
            //
            // other events
            //
            case "validatorFeeRateUpdated":
              props.onFeeUpdate(args._validatorFeeRateScaled);
              break;
          }
        }

        cursor = to;
      }

      consecutiveErrors = 0;
      await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      consecutiveErrors++;
      const backoff = Math.min(POLL_INTERVAL_MS * 2 ** consecutiveErrors, MAX_BACKOFF_MS);
      log.error({ err, backoffMs: backoff, consecutiveErrors }, "getLogs poll error — retrying");

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        const fatal = err instanceof Error ? err : new Error(String(err));
        props.onError?.(fatal);
        throw fatal;
      }

      await sleep(backoff);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
