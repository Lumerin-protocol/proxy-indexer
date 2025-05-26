// generic response type for all get requests
export type GetResponse<T> = {
  data: T;
  blockNumber: number;
};
