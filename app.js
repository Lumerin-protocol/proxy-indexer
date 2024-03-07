"use strict";

const path = require("node:path");
const AutoLoad = require("@fastify/autoload");
const cors = require("fastify-cors");

const { initialize } = require("./initialize");
const config = require("./src/config");

// Pass --options via CLI arguments in command to enable these options.
const options = {
  prefix: '/api',
};

/**
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {*} opts 
 */
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

  fastify.register(cors, {
    origin: (origin, cb) => {
      const hostname = new URL(origin).hostname
      if (hostname === "localhost") {
        //  Request from localhost will pass
        cb(null, true)
        return
      }
      if (hostname.includes("lumerin.io")) {
        cb(null, true)
        return
      }

      cb(new Error("Not allowed"), false)
    }
  }
  )

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "src/routes"),
    options: Object.assign(options, opts),
  });
};

module.exports.options = options;
