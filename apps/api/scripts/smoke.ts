/**
 * Smoke test — spins up an ephemeral MongoDB via `mongodb-memory-server`,
 * boots the API against it, hits /healthz, then tears everything down.
 *
 * This is the closest thing to a real boot we can run on a dev box
 * that doesn't have Docker up. CI should run this before publishing
 * a build — it catches: env wiring, module resolution across the
 * workspace (the ESM/shared named-export bug we hit once), Mongoose
 * connection, Express listener, route registration.
 *
 * ORDER MATTERS: `env.ts` reads + validates `process.env` at import
 * time. We must spin up the in-memory Mongo and set `process.env.MONGO_URI`
 * BEFORE we `import` anything that transitively imports `env.ts`.
 * That's why `createApp`, `connectDatabase`, etc. are loaded lazily
 * via `await import(...)` below.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

async function main(): Promise<void> {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.AUTH_SECRET =
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
      ? process.env.AUTH_SECRET
      : "smoke-test-placeholder-0123456789abcdef";
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  // Keep the log quiet for a clean pass/fail signal.
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "warn";

  // Lazy-load so env.ts sees the overrides we just set.
  const { createApp } = await import("../src/app.js");
  const { connectDatabase, disconnectDatabase } = await import(
    "../src/db/connection.js"
  );

  await connectDatabase();
  const app = createApp();
  const server = await new Promise<import("http").Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  const port = addr.port;

  const res = await fetch(`http://127.0.0.1:${port}/healthz`);
  const body = (await res.json()) as { status?: string; service?: string };
  const ok = res.status === 200 && body.status === "ok";
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      smoke: ok ? "PASS" : "FAIL",
      httpStatus: res.status,
      body,
    }),
  );

  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
  await disconnectDatabase();
  await mongo.stop();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("smoke error:", err);
  process.exit(1);
});
