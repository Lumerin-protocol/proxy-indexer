import { type Static, Type } from "@sinclair/typebox";
import envSchema from "env-schema";

const schema = Type.Object({
  ADMIN_API_KEY: Type.String(),
  CLONE_FACTORY_ADDRESS: Type.String(),
  ETH_NODE_URL: Type.String(),
  HASHRATE_ORACLE_ADDRESS: Type.String(),
  FASTIFY_PLUGIN_TIMEOUT: Type.Integer({ default: 60000 }),
  FASTIFY_CLOSE_GRACE_DELAY: Type.Integer({ default: 500 }),
  LOG_LEVEL: Type.Union(
    [
      Type.Literal("trace"),
      Type.Literal("debug"),
      Type.Literal("info"),
      Type.Literal("warn"),
      Type.Literal("error"),
      Type.Literal("fatal"),
    ],
    { default: "info" }
  ),
  MULTICALL_ADDRESS: Type.Optional(Type.String()),
  PORT: Type.Integer({ default: 3000 }),
});

export type Config = Static<typeof schema>;

export const config = envSchema<Config>({
  schema,
  dotenv: true, // load .env if it is there, default: false
});
