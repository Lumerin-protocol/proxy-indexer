import { PublicClient, getContract } from "viem";
import { hashrateOracleAbi, cloneFactoryAbi } from "contracts-js/dist/abi/abi";

export class PriceCalculator {
  private pricePerTHInToken: bigint | null;
  private oracle: ReturnType<typeof getHashrateOracleContract>;
  private cloneFactory: ReturnType<typeof getCloneFactoryContract>;
  private priceExpirationTime = new Date(0);
  private ttl = 60 * 1000; // 1 minute
  private feeRate?: bigint;
  private feeDecimals?: bigint;

  constructor(
    client: PublicClient,
    hashrateOracleAddr: `0x${string}`,
    cloneFactoryAddr: `0x${string}`
  ) {
    this.oracle = getHashrateOracleContract(client, hashrateOracleAddr);
    this.cloneFactory = getCloneFactoryContract(client, cloneFactoryAddr);
    this.pricePerTHInToken = null;
  }

  async calculatePriceAndFee(
    totalHashes: bigint,
    profitTargetPercent: bigint
  ): Promise<{ price: bigint; fee: bigint }> {
    const hashesPerToken = await this.getHashesPerTokenCached();
    const priceInTokens = totalHashes / hashesPerToken;
    const priceWithProfit =
      priceInTokens + (priceInTokens * BigInt(profitTargetPercent)) / BigInt(100);
    const { rate, decimals } = await this.getFeeRate();
    const fee = (priceWithProfit * rate) / 10n ** decimals;
    return { price: priceWithProfit, fee };
  }

  private async getHashesPerTokenCached(): Promise<bigint> {
    if (this.priceExpirationTime > new Date() && this.pricePerTHInToken !== null) {
      return this.pricePerTHInToken;
    }
    this.pricePerTHInToken = await this.getHashesPerToken();
    this.priceExpirationTime = new Date(Date.now() + this.ttl);
    return this.pricePerTHInToken!;
  }

  private async getHashesPerToken() {
    const price = await this.oracle.read.getHashesforToken();
    return price;
  }

  private async getFeeRate() {
    if (!this.feeRate || !this.feeDecimals) {
      this.feeRate = await this.cloneFactory.read.validatorFeeRateScaled();
      this.feeDecimals = BigInt(await this.cloneFactory.read.VALIDATOR_FEE_DECIMALS());
    }
    return { rate: this.feeRate, decimals: this.feeDecimals };
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
