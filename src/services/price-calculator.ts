import { hashrateOracleAbi } from "contracts-js/dist/abi/abi";
import viem, { PublicClient } from "viem";

export class PriceCalculator {
  private pricePerTHInToken: bigint | null;
  private priceBlockNumber: number | null;
  private oracle: ReturnType<typeof getHashrateOracleContract>;
  private priceExpirationTime = new Date(0);
  private ttl = 60 * 1000; // 1 minute

  constructor(client: PublicClient, hashrateOracleAddr: `0x${string}`) {
    this.oracle = getHashrateOracleContract(client, hashrateOracleAddr);
    this.pricePerTHInToken = null;
    this.priceBlockNumber = null;
  }

  async calculatePrice(totalHashrateInTH: bigint, profitTargetPercent: bigint) {
    const pricePerTHinTokens = await this.getPricePerTHInTokenCached();
    const priceInTokens = pricePerTHinTokens * totalHashrateInTH;
    const priceWithProfit =
      priceInTokens + (priceInTokens * BigInt(profitTargetPercent)) / BigInt(100);
    return priceWithProfit;
  }

  private async getPricePerTHInTokenCached(): Promise<bigint> {
    if (this.priceExpirationTime > new Date() && this.pricePerTHInToken !== null) {
      return this.pricePerTHInToken;
    }
    this.pricePerTHInToken = await this.getPricePerTHInToken();
    this.priceExpirationTime = new Date(Date.now() + this.ttl);
    return this.pricePerTHInToken;
  }

  private async getPricePerTHInToken() {
    const price = await this.oracle.read.getRewardPerTHinToken();
    return price;
  }
}

function getHashrateOracleContract(client: PublicClient, hashrateOracleAddr: `0x${string}`) {
  return viem.getContract({
    address: hashrateOracleAddr,
    abi: hashrateOracleAbi,
    client: client,
  });
}
