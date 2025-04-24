export const CONTRACT_STATE = {
  Available: "0",
  Running: "1",
} as const;

export type ContractState = (typeof CONTRACT_STATE)[keyof typeof CONTRACT_STATE];

/** Represents an internal contract object.**/
export type Contract = {
  id: string;
  state: ContractState;
  version: string;
  price: string;
  limit: string;
  speed: string;
  length: string;
  profitTarget: string;
  startingBlockTimestamp: string;
  buyer: string;
  seller: string;
  encrValidatorUrl: string;
  isDeleted: boolean;
  balance: string;
  hasFutureTerms: boolean;
  history: ContractHistory[];
  stats: Stats;
  futureTerms?: FutureTerms;
};

/** Represents an internal stats object.**/
export type Stats = {
  successCount: string;
  failCount: string;
};

/** Represents an internal contract history object.**/
export type ContractHistory = {
  buyer: string;
  endTime: string;
  price: string;
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
