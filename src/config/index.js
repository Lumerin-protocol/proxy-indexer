const envSchema = require("env-schema");

const schema = {
  type: "object",
  required: ["ETH_NODE_URL", "CLONE_FACTORY_ADDRESS", "ADMIN_API_KEY"],
  properties: {
    ADMIN_API_KEY: {
      type: "string",
    },
    CLONE_FACTORY_ADDRESS: {
      type: "string",
    },
    ETH_NODE_URL: {
      type: "string",
    },
    FASTIFY_PLUGIN_TIMEOUT: {
      type: "integer",
      default: 60000,
    },
    PORT: {
      type: "string",
      default: "3000",
    },
  },
};

const config = envSchema({
  schema,
  dotenv: true, // load .env if it is there, default: false
});

module.exports = config;
