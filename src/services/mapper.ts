import { ContractState, HashrateContract } from "../types/hashrate-contract";
import { FutureTerms, ContractHistory, Stats } from "../types/hashrate-contract";
import {
  FutureTermsEntry,
  HistoryEntry,
  PublicVariablesV2Entry,
  StatsEntry,
} from "./blockchain.types";

export function mapContract(
  address: string,
  pub: PublicVariablesV2Entry,
  fut: FutureTermsEntry | undefined,
  history: HistoryEntry,
  stats: StatsEntry
): HashrateContract {
  const pubVars = mapPublicVariablesV2(address, pub);

  return {
    ...pubVars,
    state: pubVars.state as ContractState,
    fee: "0",
    futureTerms: mapFutureTerms(fut),
    history: mapHistory(history),
    stats: mapStats(stats),
  };
}

export function mapPublicVariablesV2(addr: string, pub: PublicVariablesV2Entry) {
  const [
    state,
    terms,
    startingBlockTimestamp,
    buyer,
    seller,
    encrValidatorUrl,
    isDeleted,
    balance,
    hasFutureTerms,
  ] = pub;

  return {
    id: addr.toLowerCase(),
    state: state.toString(),
    price: terms._price.toString(),
    limit: terms._limit.toString(),
    speed: terms._speed.toString(),
    length: terms._length.toString(),
    version: terms._version.toString(),
    profitTarget: terms._profitTarget.toString(),
    startingBlockTimestamp: startingBlockTimestamp.toString(),
    buyer: buyer.toString(),
    seller: seller.toString(),
    encrValidatorUrl: encrValidatorUrl.toString(),
    isDeleted: isDeleted,
    balance: balance.toString(),
    hasFutureTerms: hasFutureTerms,
  };
}

export function mapFutureTerms(futureTerms: FutureTermsEntry | undefined): FutureTerms | undefined {
  if (!futureTerms) {
    return undefined;
  }
  const [, , speed, length, version, profitTarget] = futureTerms;
  return {
    speed: speed.toString(),
    length: length.toString(),
    version: version.toString(),
    profitTarget: profitTarget.toString(),
  };
}

export function mapHistory(history: HistoryEntry): ContractHistory[] {
  return history.map((data) => ({
    buyer: data._buyer,
    endTime: data._endTime.toString(),
    price: data._price.toString(),
    speed: data._speed.toString(),
    length: data._length.toString(),
    purchaseTime: data._purchaseTime.toString(),
    isGoodCloseout: data._goodCloseout,
  }));
}

export function mapStats(stats: StatsEntry): Stats {
  const [successCount, failCount] = stats;
  return {
    successCount: successCount.toString(),
    failCount: failCount.toString(),
  };
}
