// @ts-check

class ContractMapper {
  /**
   * Maps a raw contract object to a Contract object.
   * @param {string} id - The contract id.
   * @param {RawContract} rawContract - The raw contract object.
   * @returns {Contract} The mapped Contract object.
   */
  map(id, rawContract) {
    const { data, futureTerms: rawFutureTerms } = rawContract;
    const { _terms: terms } = data;

    const futureTerms = this.mapFutureTerms(rawFutureTerms);
    const history = this.mapHistory(rawContract.history);
    const stats = this.mapStats(rawContract.stats);

    return {
      id,
      state: data._state.toString(),
      price: terms._price.toString(),
      limit: terms._limit.toString(),
      speed: terms._speed.toString(),
      length: terms._length.toString(),
      version: terms._version.toString(),
      profitTarget: terms._profitTarget.toString(),
      startingBlockTimestamp: data._startingBlockTimestamp.toString(),
      buyer: data._buyer,
      seller: data._seller,
      encrValidatorUrl: data._encryptedPoolData,
      isDeleted: data._isDeleted,
      balance: data._balance.toString(),
      hasFutureTerms: data._hasFutureTerms,
      futureTerms,
      history,
      stats,
    };
  }

  /**
   *
   * @property {import("contracts-js/dist/generated-types/Implementation").FutureTermsResponse} [futureTerms]
   * @returns {FutureTerms | undefined}
   */
  mapFutureTerms(rawFutureTerms) {
    return rawFutureTerms
      ? {
          price: rawFutureTerms._price.toString(),
          limit: rawFutureTerms._limit.toString(),
          speed: rawFutureTerms._speed.toString(),
          length: rawFutureTerms._length.toString(),
          version: rawFutureTerms._version.toString(),
          profitTarget: rawFutureTerms._profitTarget.toString(),
        }
      : undefined;
  }

  /**
   *
   * @param {import("contracts-js/dist/generated-types/Implementation").HistoryentryResponse[]} history
   * @returns {ContractHistory[]}
   */
  mapHistory(history) {
    return history.map((h) => ({
      buyer: h._buyer,
      endTime: h._endTime.toString(),
      price: h._price.toString(),
      speed: h._speed.toString(),
      length: h._length.toString(),
      purchaseTime: h._purchaseTime.toString(),
      isGoodCloseout: h._goodCloseout,
    }));
  }

  /** 
   * Maps a stats object to a stats object.
   * @param {import("contracts-js/dist/generated-types/Implementation").GetStatsResponse} stats
   * @returns {Stats}
   */
  mapStats(stats) {
    return {
      successCount: stats._successCount.toString(),
      failCount: stats._failCount.toString(),
    };
  }
}

module.exports = { ContractMapper };
