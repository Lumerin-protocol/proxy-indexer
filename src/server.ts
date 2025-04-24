import { config } from "./config/config";

import Fastify from "fastify";
import closeWithGrace from "close-with-grace";
import AutoLoad from "@fastify/autoload";
import cors from "@fastify/cors";
import path from "node:path";
import { router } from "./routes/root";
import { ContractsInMemoryIndexer } from "./services/cache.repo";
import { ContractsLoader } from "./services/blockchain.repo";
import sensible from "@fastify/sensible";

// Register your application as a normal plugin.

export function startServer(indexer: ContractsInMemoryIndexer, loader: ContractsLoader) {
  return new Promise((resolve, reject) => {
    const options = {
      prefix: "/api",
    };

    const app = Fastify({
      logger: {},
    });

    app.register(async (instance, opts) => {
      console.log(`Running server with config: ${JSON.stringify(config)}`);

      instance.register(sensible);
      instance.register(cors, {
        origin: "*",
      });

      // This loads all plugins defined in routes
      // define your routes in one of these
      instance.register(async (instance) => {
        router(instance, config, indexer, loader);
      });
    });

    // delay is the number of milliseconds for the graceful close to finish
    closeWithGrace(
      { delay: config.FASTIFY_CLOSE_GRACE_DELAY },
      async function ({ signal, err, manual }) {
        if (err) {
          app.log.error(err);
        }
        await app.close();
      }
    );

    // Start listening.
    app.listen({ port: config.PORT }, (err) => {
      if (err) {
        app.log.error(err);
        reject(err);
      }
    });
  });
}
