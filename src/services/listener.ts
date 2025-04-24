import { config } from "../config/config";
import { parseAbi, PublicClient } from "viem";

type StartWatchProps = {
  initialContractsToWatch: Set<string>;
  onContractUpdate: (contractAddr: string, blockNumber: number) => void;
  onError?: (error: Error) => void;
  blockNumber?: number;
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
  const eventsAbi = [
    // Clone Factory Events
    "event contractCreated(address indexed _address, string _pubkey)",
    "event clonefactoryContractPurchased(address indexed _address, address indexed _validator)",
    "event contractDeleteUpdated(address _address, bool _isDeleted)",
    "event purchaseInfoUpdated(address indexed _address)",

    // Implementation Events
    "event closedEarly(uint8 reason)",
    "event fundsClaimed()",
    "event destinationUpdated(string newValidatorURL, string newDestURL)",
  ];

  let unwatch: () => void;

  unwatch = pc.watchEvent({
    address: addresses,
    events: parseAbi(eventsAbi),
    poll: true,
    pollingInterval: 1000,
    fromBlock: props.blockNumber ? BigInt(props.blockNumber) : undefined,
    onLogs: (logs) => {
      console.log(`Received logs: ${logs.length}`);

      logs.forEach((log) => {
        const { eventName, args, address, blockNumber } = log;
        let contractAddress = null;
        if (cloneFactoryEvents.includes(eventName)) {
          contractAddress = (args as any)._address;
        } else {
          contractAddress = address;
        }
        console.log(`Received log for contract: ${contractAddress}`);

        props.onContractUpdate(contractAddress, Number(blockNumber));

        if (eventName === "contractCreated") {
          contractsToWatch.add(contractAddress);
          console.log("Got contract created event, restating watch");
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
      console.error("On Error Callback", error);
      props.onError?.(error);
    },
  });

  return { unwatch };
}
