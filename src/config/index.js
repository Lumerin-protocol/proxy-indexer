const envSchema = require("env-schema");

const schema = {
  type: "object",
  required: ["WS_ETH_NODE_URL", "CLONE_FACTORY_ADDRESS"],
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
  },
};

const config = envSchema({
  schema,
  dotenv: true, // load .env if it is there, default: false
});

module.exports = config;
