const envSchema = require("env-schema");

const schema = {
  type: "object",
  required: ["WS_ETH_NODE_URL", "CLONE_FACTORY_ADDRESS", "ADMIN_API_KEY"],
  properties: {
    WS_ETH_NODE_URL: {
      type: "string",
    },
    PORT: {
      type: "string",
      default: "3000",
    },
    CLONE_FACTORY_ADDRESS: {
      type: "string",
    },
    ADMIN_API_KEY: {
      type: "string",
    },
  },
};

const config = envSchema({
  schema,
  dotenv: true, // load .env if it is there, default: false
});

module.exports = config;
