/**
 * Global test setup — spins up an in-memory MongoDB once per run.
 *
 * `mongodb-memory-server` downloads a Mongo binary on first run (cached
 * under ~/.cache). Subsequent runs boot in <1s. We set MONGO_URI before
 * any app module reads it, then connect mongoose.
 *
 * Between tests we drop collections to keep the audit `seq` counter
 * (in-memory module state) meaningful — not the DB connection.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

// These must be set before any app module that reads env at import time.
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? "test-secret-at-least-sixteen-chars";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "fatal";

let mongod: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
