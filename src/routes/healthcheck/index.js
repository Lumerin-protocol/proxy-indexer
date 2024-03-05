"use strict";

const config = require("../../config");

module.exports = async function (fastify, opts) {
  fastify.get("/", async function (request, reply) {
    return {
      status: "ok",
      version: process.env.npm_package_version,
      cloneFactoryAddress: config.CLONE_FACTORY_ADDRESS,
    };
  });
};
