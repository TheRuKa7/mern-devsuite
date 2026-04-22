/**
 * Mongoose connection lifecycle.
 *
 * One connection per process, established at boot and shared across
 * the request pipeline. We prefer explicit lifecycle management
 * (`connectDatabase` / `disconnectDatabase`) over Mongoose's implicit
 * buffer-then-drain behaviour so tests can spin up their own in-memory
 * server via `mongodb-memory-server` without leaking state.
 */
import mongoose from "mongoose";
import { env } from "../env.js";
import { logger } from "../logger.js";

export async function connectDatabase(uri: string = env.MONGO_URI): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    // Fail fast in CI / boot rather than buffer commands forever.
    serverSelectionTimeoutMS: 5_000,
  });
  logger.info({ uri: uri.replace(/:\/\/.*@/, "://***@") }, "mongo connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
