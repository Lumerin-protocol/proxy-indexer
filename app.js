"use strict";

const path = require("node:path");
const AutoLoad = require("@fastify/autoload");

const { initialize } = require("./initialize");
const config = require("./src/config");

// Pass --options via CLI arguments in command to enable these options.
const options = {
  prefix: '/api',
};

module.exports = async function (fastify, opts) {
  console.log(`Running server with config: ${JSON.stringify(config)}`)

  // Write cusrom code here
  await initialize(config);

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "src/plugins"),
    options: Object.assign(options, opts),
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "src/routes"),
    options: Object.assign(options, opts),
  });
};

module.exports.options = options;
