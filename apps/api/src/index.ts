/**
 * API entry point — boots the Express 5 app, connects to MongoDB,
 * and wires graceful shutdown.
 *
 * The actual middleware stack + routes live in `app.ts` (factory).
 * This file exists only to own the process lifecycle: DB connection,
 * HTTP listener, signal handling, unhandled-rejection logging.
 */
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./db/connection.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  // Fail fast if Mongo is unreachable — better to exit 1 and let the
  // orchestrator (Docker, Render, k8s) restart us than to serve 500s.
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      "api listening",
    );
  });

  // --- Graceful shutdown --------------------------------------------
  //
  // On SIGTERM/SIGINT: stop accepting new connections, drain in-flight
  // requests, close the Mongo pool, then exit. A 10s hard-kill timer
  // guards against a hung request keeping the process alive.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "shutdown initiated");
    const forceExit = setTimeout(() => {
      logger.error("shutdown timed out after 10s — force exit");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async (err) => {
      if (err) logger.error({ err }, "http server close error");
      try {
        await disconnectDatabase();
      } catch (e) {
        logger.error({ err: e }, "mongo disconnect error");
      }
      clearTimeout(forceExit);
      process.exit(err ? 1 : 0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Unhandled errors — log and let the process crash. A supervisor
  // should restart us; half-broken state is worse than a cold boot.
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaughtException — exiting");
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});
