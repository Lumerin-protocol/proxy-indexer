import { abi } from "contracts-js";
import type { PublicClient } from "viem";
import { getContract } from "viem";

// Using ReturnType applied to the function to alias the type from the blockchain call

export type PublicVariablesV2Entry = Awaited<ReturnType<typeof getPublicVariablesV2>>;
export type HistoryEntry = Awaited<ReturnType<typeof getHistory>>;
export type StatsEntry = Awaited<ReturnType<typeof getStats>>;
export type FutureTermsEntry = Awaited<ReturnType<typeof getFutureTerms>>;

export function getCloneFactoryContract(pc: PublicClient, cloneFactoryAddr: string) {
  return getContract({
    address: cloneFactoryAddr as `0x${string}`,
    abi: abi.cloneFactoryAbi,
    client: pc,
  });
}

export function getPublicVariablesV2(pc: PublicClient, contractId: string) {
  return getContract({
    address: contractId as `0x${string}`,
    abi: abi.implementationAbi,
    client: pc,
  }).read.getPublicVariablesV2();
}

export function getHistory(pc: PublicClient, contractId: string) {
  return getContract({
    address: contractId as `0x${string}`,
    abi: abi.implementationAbi,
    client: pc,
  }).read.getHistory([0n, 100]);
}

export function getStats(pc: PublicClient, contractId: string) {
  return getContract({
    address: contractId as `0x${string}`,
    abi: abi.implementationAbi,
    client: pc,
  }).read.getStats();
}

export function getFutureTerms(pc: PublicClient, contractId: string) {
  return getContract({
    address: contractId as `0x${string}`,
    abi: abi.implementationAbi,
    client: pc,
  }).read.futureTerms();
}
