'use strict'

const { ContractsInMemoryIndexer } = require('../../ContractsInMemoryIndexer');

module.exports = async function (fastify, opts) {
  const indexer = ContractsInMemoryIndexer.getInstance();

  fastify.get('/', async function (request, reply) {
    const { walletAddr } = request.query;
    return indexer.getAll(walletAddr);
  })

  fastify.get('/:id', async function (request, reply) {
    const { params, query } = request;
    const { id } = params;
    const { walletAddr } = query;
  
    const contract = await indexer.get(id, walletAddr);
    if (!contract) {
      return fastify.httpErrors.notFound('Contract not found');
    }
    return contract;
  })
}
