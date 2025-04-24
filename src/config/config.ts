import envSchema from "env-schema";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

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
    FASTIFY_CLOSE_GRACE_DELAY: {
      type: "integer",
      default: 500,
    },
    PORT: {
      type: "integer",
      default: 3000,
    },
  },
} as const satisfies JSONSchema;

export type Config = FromSchema<typeof schema>;

export const config = envSchema<Config>({
  schema,
  dotenv: true, // load .env if it is there, default: false
});
