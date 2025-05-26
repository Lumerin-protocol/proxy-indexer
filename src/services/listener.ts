import { abi } from "contracts-js";
import type { FastifyBaseLogger } from "fastify";
import { type PublicClient, getAbiItem, isAddressEqual } from "viem";
import { config } from "../config/env";

const cfAbi = abi.cloneFactoryAbi;
const implAbi = abi.implementationAbi;

type StartWatchProps = {
  initialContractsToWatch: Set<string>;
  onContractUpdate: (contractAddr: string, blockNumber: number) => void;
  onFeeUpdate: (newFeeRateScaled: bigint) => void;
  onError?: (error: Error) => void;
  blockNumber?: number;
  log: FastifyBaseLogger;
};

export function startWatchPromise(pc: PublicClient, props: StartWatchProps): Promise<never> {
  return new Promise((_, reject) => {
    const { unwatch } = startWatch(pc, {
      ...props,
      onError: (err) => {
        props.onError?.(err);
        unwatch();
        reject(err);
      },
    });
  });
}

function startWatch(pc: PublicClient, props: StartWatchProps) {
  const contractsToWatch = props.initialContractsToWatch;

  const addresses = [config.CLONE_FACTORY_ADDRESS, ...contractsToWatch] as `0x${string}`[];

  const eventsAbi2 = [
    // Clone Factory Events
    getAbiItem({ abi: cfAbi, name: "contractCreated" }),
    getAbiItem({ abi: cfAbi, name: "clonefactoryContractPurchased" }),
    getAbiItem({ abi: cfAbi, name: "contractDeleteUpdated" }),
    getAbiItem({ abi: cfAbi, name: "purchaseInfoUpdated" }),
    getAbiItem({ abi: cfAbi, name: "validatorFeeRateUpdated" }),
    // Implementation Events
    getAbiItem({ abi: implAbi, name: "closedEarly" }),
    getAbiItem({ abi: implAbi, name: "destinationUpdated" }),
    getAbiItem({ abi: implAbi, name: "fundsClaimed" }),
  ];

  let unwatch: () => void;

  unwatch = pc.watchEvent({
    address: addresses,
    events: eventsAbi2,
    poll: true,
    pollingInterval: 1000,
    fromBlock: props.blockNumber ? BigInt(props.blockNumber) : undefined,
    onLogs: (logs) => {
      props.log.info(`Received logs: ${logs.length}`);

      for (const log of logs) {
        const { eventName, args, address, blockNumber } = log;
        props.log.info(
          `Received ${log.eventName} on ${log.address} with args ${JSON.stringify(log.args)}`
        );

        switch (eventName) {
          //
          // contract update emitted on implementation contract
          //
          case "closedEarly":
            return props.onContractUpdate(address, Number(blockNumber));
          case "destinationUpdated":
            return props.onContractUpdate(address, Number(blockNumber));
          case "fundsClaimed":
            return props.onContractUpdate(address, Number(blockNumber));
          //
          // contract update emitted on clonefactory contract
          //
          case "clonefactoryContractPurchased":
            return props.onContractUpdate(args._address!, Number(blockNumber));
          case "contractDeleteUpdated":
            return props.onContractUpdate(args._address!, Number(blockNumber));
          case "purchaseInfoUpdated":
            // this event is emitted both on clonefactory and implementation contract with the same abi
            if (isAddressEqual(address, config.CLONE_FACTORY_ADDRESS as `0x${string}`)) {
              props.onContractUpdate(args._address!, Number(blockNumber));
            }
            return;
          //
          // contract created has to restart the watch
          //
          case "contractCreated": {
            contractsToWatch.add(args._address!);
            props.log.info("Got contract created event, restating watch");
            unwatch();
            const newWatch = startWatch(pc, {
              ...props,
              blockNumber: Number(blockNumber + 1n),
              initialContractsToWatch: contractsToWatch,
            });
            unwatch = newWatch.unwatch;
            return props.onContractUpdate(args._address!, Number(blockNumber));
          }
          //
          // other events
          //
          case "validatorFeeRateUpdated":
            return props.onFeeUpdate(args._validatorFeeRateScaled!);
        }
      }
    },
    onError: (error) => {
      props.log.error("Event listener error", error);
      props.onError?.(error);
    },
  });

  return { unwatch };
}
