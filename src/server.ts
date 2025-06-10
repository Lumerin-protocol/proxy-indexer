import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import closeWithGrace from "close-with-grace";
import Fastify from "fastify";
import type pino from "pino";
import type { Logger } from "pino";
import { config } from "./config/env";
import { router } from "./routes/root";
import type { ContractsLoader } from "./services/blockchain.repo";
import type { Cache } from "./services/cache.repo";
import type { ContractService } from "./services/contract.service";

export class Server {
  private app: ServerType;

  constructor(
    readonly indexer: Cache,
    readonly loader: ContractsLoader,
    readonly service: ContractService,
    readonly log: Logger
  ) {
    this.app = createServer(log);

    this.app.register(
      async (instance, opts) => {
        instance.register(sensible);
        instance.register(cors, {
          origin: "*",
        });
        router(instance as ServerType, config, service, indexer, loader);

        // This loads all plugins defined in routes
        // define your routes in one of these
      },
      {
        prefix: "/api",
      }
    );
  }

  getLogger() {
    return this.app.log;
  }

  async start() {
    return new Promise((resolve, reject) => {
      const app = this.app;
      // delay is the number of milliseconds for the graceful close to finish
      closeWithGrace(
        { delay: config.FASTIFY_CLOSE_GRACE_DELAY },
        async ({ signal, err, manual }) => {
          if (err) {
            app.log.error(err);
          }
          await app.close();
        }
      );

      // Start listening.
      app.listen({ port: config.PORT, host: "0.0.0.0" }, (err) => {
        if (err) {
          app.log.error(err);
          reject(err);
        }
      });
    });
  }
}

function createServer(log: pino.BaseLogger) {
  const server = Fastify({
    logger: log,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  return server;
}

export type ServerType = ReturnType<typeof createServer>;
