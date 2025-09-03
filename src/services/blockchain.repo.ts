import { abi } from "contracts-js";
import type { PublicClient } from "viem";
import type { HashrateContract } from "../types/hashrate-contract.js";
import {
  type HistoryEntry,
  type PublicVariablesV2Entry,
  type StatsEntry,
  getCloneFactoryContract,
} from "./blockchain.types";
import { mapContract, mapFutureTerms } from "./mapper";

export class ContractsLoader {
  pc: PublicClient;
  cloneFactory: ReturnType<typeof getCloneFactoryContract>;
  feeTokenAddr: `0x${string}`;

  constructor(pc: PublicClient, cloneFactoryAddr: string, feeTokenAddr: `0x${string}`) {
    this.pc = pc;
    this.cloneFactory = getCloneFactoryContract(pc, cloneFactoryAddr);
    this.feeTokenAddr = feeTokenAddr;
  }

  async loadAll() {
    const blockNumber = await this.pc.getBlockNumber();
    const contractIds = await this.cloneFactory.read
      .getContractList({ blockNumber })
      .then((res) => res.map((id) => id.toLowerCase() as `0x${string}`));

    const results = await this.pc.multicall({
      contracts: contractIds.flatMap((id) => [
        {
          abi: abi.implementationAbi,
          address: id,
          functionName: "getPublicVariablesV2",
        } as const,
        {
          abi: abi.implementationAbi,
          address: id,
          functionName: "getHistory",
          args: ["0", "100"],
        } as const,
        {
          abi: abi.implementationAbi,
          address: id,
          functionName: "getStats",
        } as const,
        {
          abi: abi.implementationAbi,
          address: id,
          functionName: "validator",
        } as const,
        {
          abi: abi.lumerinTokenAbi,
          address: this.feeTokenAddr,
          functionName: "balanceOf",
          args: [id],
        } as const,
      ]),
      allowFailure: false,
      blockNumber,
    });

    // split results into chunks
    const chunks = chunkArray(results, 5) as [
      PublicVariablesV2Entry,
      HistoryEntry,
      StatsEntry,
      `0x${string}`,
      bigint
    ][];
    const contractsMap: Record<string, HashrateContract> = {};

    // load future terms for contracts that have them
    const indexesToLoadFutureTerms: number[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const [publicVariablesV2, history, stats, validator, balance] = chunks[i];
      const contractId = contractIds[i];
      const mapped = mapContract(
        contractId,
        publicVariablesV2,
        undefined,
        history,
        stats,
        validator,
        balance
      );
      contractsMap[contractId] = mapped;
      if (mapped.hasFutureTerms) {
        indexesToLoadFutureTerms.push(i);
      }
    }

    const futureTermsChunks = await this.pc.multicall({
      contracts: indexesToLoadFutureTerms.map(
        (i) =>
          ({
            abi: abi.implementationAbi,
            address: contractIds[i],
            functionName: "futureTerms",
          } as const)
      ),
      allowFailure: false,
    });

    for (let i = 0; i < futureTermsChunks.length; i++) {
      const futureTerms = futureTermsChunks[i];
      const contractId = contractIds[indexesToLoadFutureTerms[i]];
      contractsMap[contractId].futureTerms = mapFutureTerms(futureTerms);
    }

    // reconstruct the contracts array by order of contractIds
    const contracts = contractIds.map((id) => contractsMap[id]);
    return { contracts, blockNumber };
  }

  async getContract(contractId: `0x${string}`): Promise<HashrateContract> {
    const multicall = await this.pc.multicall({
      contracts: [
        {
          abi: abi.implementationAbi,
          address: contractId,
          functionName: "getPublicVariablesV2",
        } as const,
        {
          abi: abi.implementationAbi,
          address: contractId,
          functionName: "getHistory",
          args: [0n, 100],
        } as const,
        {
          abi: abi.implementationAbi,
          address: contractId,
          functionName: "getStats",
        } as const,
        {
          abi: abi.implementationAbi,
          address: contractId,
          functionName: "futureTerms",
        } as const,
        {
          abi: abi.implementationAbi,
          address: contractId,
          functionName: "validator",
        } as const,
        {
          abi: abi.lumerinTokenAbi,
          address: this.feeTokenAddr,
          functionName: "balanceOf",
          args: [contractId],
        } as const,
      ],
      allowFailure: false,
    });

    const [pub, history, stats, futureTerms, validator, balance] = multicall;

    return mapContract(contractId, pub, futureTerms, history, stats, validator, balance);
  }

  async getFeeRate() {
    return {
      value: await this.cloneFactory.read.validatorFeeRateScaled(),
      decimals: BigInt(await this.cloneFactory.read.VALIDATOR_FEE_DECIMALS()),
    };
  }
}

function chunkArray<T, N extends number>(array: T[], size: N): T[][] & { length: N } {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks as T[][] & { length: N };
}
