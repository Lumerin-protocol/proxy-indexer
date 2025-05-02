import { config } from "../config/env";
import { getAbiItem, parseAbi, PublicClient } from "viem";
import { FastifyBaseLogger } from "fastify";
import { abi } from "contracts-js";

const cfAbi = abi.cloneFactoryAbi;
const implAbi = abi.implementationAbi;

type StartWatchProps = {
  initialContractsToWatch: Set<string>;
  onContractUpdate: (contractAddr: string, blockNumber: number) => void;
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

  const cloneFactoryEvents = [
    "contractCreated",
    "clonefactoryContractPurchased",
    "contractDeleteUpdated",
    "purchaseInfoUpdated",
  ];

  const eventsAbi2 = [
    // Clone Factory Events
    getAbiItem({ abi: cfAbi, name: "contractCreated" }),
    getAbiItem({ abi: cfAbi, name: "clonefactoryContractPurchased" }),
    getAbiItem({ abi: cfAbi, name: "contractDeleteUpdated" }),
    getAbiItem({ abi: cfAbi, name: "purchaseInfoUpdated" }),
    // Implementation Events
    getAbiItem({ abi: implAbi, name: "closedEarly" }),
    getAbiItem({ abi: implAbi, name: "fundsClaimed" }),
    getAbiItem({ abi: implAbi, name: "destinationUpdated" }),
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

      logs.forEach((log) => {
        const { eventName, args, address, blockNumber } = log;
        let contractAddress = null;
        if (cloneFactoryEvents.includes(eventName)) {
          contractAddress = (args as any)._address;
        } else {
          contractAddress = address;
        }
        props.log.info(`Received ${eventName}, for ${contractAddress} contract`);

        props.onContractUpdate(contractAddress, Number(blockNumber));

        if (eventName === "contractCreated") {
          contractsToWatch.add(contractAddress);
          props.log.info("Got contract created event, restating watch");
          unwatch();
          const newWatch = startWatch(pc, {
            ...props,
            blockNumber: Number(blockNumber),
            initialContractsToWatch: contractsToWatch,
          });
          unwatch = newWatch.unwatch;
        }
      });
    },
    onError: (error) => {
      props.log.error("Event listener error", error);
      props.onError?.(error);
    },
  });

  return { unwatch };
}
