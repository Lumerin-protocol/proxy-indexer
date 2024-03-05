/**
 * Represents a contract object from blockchain.
 * @typedef {Object} RawContract
 * @property {import("contracts-js/dist/generated-types/Implementation").GetPublicVariablesV2Response} data
 * @property {import("contracts-js/dist/generated-types/Implementation").FutureTermsResponse} [futureTerms]
 * @property {import("contracts-js/dist/generated-types/Implementation").HistoryentryResponse[]} history
 * @property {import("contracts-js/dist/generated-types/Implementation").GetStatsResponse} stats
 */

/**
 * Represents a mapped contract object.
 * @typedef {Object} Contract
 * @property {string} id
 * @property {string} state
 * @property {string} version
 * @property {string} price
 * @property {string} limit
 * @property {string} speed
 * @property {string} length
 * @property {string} profitTarget
 * @property {string} startingBlockTimestamp
 * @property {string} buyer
 * @property {string} seller
 * @property {string} encrValidatorUrl
 * @property {boolean} isDeleted
 * @property {string} balance
 * @property {boolean} hasFutureTerms
 * @property {ContractHistory[]} history
 * @property {Stats} stats
 * @property {FutureTerms} [futureTerms]
 */

/**
 * Represents a mapped contract stats object.
 * @typedef {Object} Stats
 * @property {string} successCount
 * @property {string} failCount
 */

/**
 * Represents a mapped contract history object.
 * @typedef {Object} ContractHistory
 * @property {string} buyer
 * @property {string} endTime
 * @property {string} price
 * @property {string} speed
 * @property {string} length
 * @property {string} purchaseTime
 * @property {boolean} isGoodCloseout
 */

/**
 * Represents a mapped future terms object.
 * @typedef {Object} FutureTerms
 * @property {string} price
 * @property {string} limit
 * @property {string} speed
 * @property {string} length
 * @property {string} version
 * @property {string} profitTarget
 */
