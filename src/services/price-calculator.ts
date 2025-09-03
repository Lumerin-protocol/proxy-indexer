import { Mutex } from "async-mutex";
import { cloneFactoryAbi, hashrateOracleAbi } from "contracts-js/dist/abi/abi";
import type { Logger } from "pino";
import { type PublicClient, getContract } from "viem";
import type { FeeRate } from "./cache.repo";

interface FeeRateGetter {
  getFeeRate(): FeeRate;
}

export class PriceCalculator {
  private pricePerTHInToken: bigint | null;
  private oracle: ReturnType<typeof getHashrateOracleContract>;
  private priceExpirationTime = new Date(0);
  private ttl = 10 * 1000; // 10 seconds
  private mutex = new Mutex();
  private feeRateGetter: FeeRateGetter;
  private log: Logger;

  constructor(client: PublicClient, hashrateOracleAddr: `0x${string}`, feeRateGetter: FeeRateGetter, log: Logger) {
    this.oracle = getHashrateOracleContract(client, hashrateOracleAddr);
    this.pricePerTHInToken = null;
    this.feeRateGetter = feeRateGetter;
    this.log = log;
  }

  async calculatePriceAndFee(
    totalHashes: bigint,
    profitTargetPercent: bigint,
  ): Promise<{ price: bigint; fee: bigint }> {
    const hashesPerToken = await this.getHashesPerTokenCached();
    const priceInTokens = totalHashes / hashesPerToken;
    const priceWithProfit = priceInTokens + (priceInTokens * BigInt(profitTargetPercent)) / BigInt(100);
    const { value, decimals } = await this.getFeeRate();
    const fee = (priceWithProfit * value) / 10n ** decimals;
    return { price: priceWithProfit, fee };
  }

  private async getHashesPerTokenCached(): Promise<bigint> {
    return await this.mutex.runExclusive(async () => {
      if (this.priceExpirationTime > new Date() && this.pricePerTHInToken !== null) {
        return this.pricePerTHInToken;
      }
      this.pricePerTHInToken = await this.getHashesPerToken();
      this.priceExpirationTime = new Date(Date.now() + this.ttl);
      return this.pricePerTHInToken!;
    });
  }

  private async getHashesPerToken() {
    const price = await this.oracle.read.getHashesforToken();
    this.log.info("fetched hashes per token: %s", price);
    return price;
  }

  private async getFeeRate() {
    return this.feeRateGetter.getFeeRate();
  }
}

function getHashrateOracleContract(client: PublicClient, hashrateOracleAddr: `0x${string}`) {
  return getContract({
    address: hashrateOracleAddr,
    abi: hashrateOracleAbi,
    client: client,
  });
}

function getCloneFactoryContract(client: PublicClient, cloneFactoryAddr: `0x${string}`) {
  return getContract({
    address: cloneFactoryAddr,
    abi: cloneFactoryAbi,
    client: client,
  });
}
