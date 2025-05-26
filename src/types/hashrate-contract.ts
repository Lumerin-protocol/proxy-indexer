/** Represents an internal contract object.**/
export type HashrateContract = {
  id: string;
  state: ContractState;
  version: string;
  price: string;
  fee: string;
  speed: string; // in hashes per second
  length: string; // in seconds
  profitTarget: string; // in percent
  startingBlockTimestamp: string;
  buyer: string;
  seller: string;
  encrValidatorUrl: string;
  isDeleted: boolean;
  balance: string;
  feeBalance: string;
  hasFutureTerms: boolean;
  history: ContractHistory[];
  stats: Stats;
  futureTerms?: FutureTerms;
  validator: `0x${string}`;
};

/** Represents an internal stats object.**/
export type Stats = {
  successCount: string;
  failCount: string;
};

/** Represents an internal contract history object.**/
export type ContractHistory = {
  buyer: string;
  validator: string;
  endTime: string;
  price: string;
  fee: string;
  speed: string;
  length: string;
  purchaseTime: string;
  isGoodCloseout: boolean;
};

/** Represents an internal future terms object.**/
export type FutureTerms = {
  speed: string;
  length: string;
  version: string;
  profitTarget: string;
};

export const CONTRACT_STATE = {
  Available: "0",
  Running: "1",
} as const;

export type ContractState = (typeof CONTRACT_STATE)[keyof typeof CONTRACT_STATE];
