/**
 * MongoDB client for the web — used by the Auth.js adapter and server
 * components that need direct reads.
 *
 * Next.js dev mode hot-reloads server modules, which would spawn a new
 * connection pool on every reload. We stash the client on `globalThis`
 * so it survives HMR.
 */
import { MongoClient } from "mongodb";
import { serverEnv } from "@/env";

declare global {
  var __mongoClient: MongoClient | undefined;
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = serverEnv.MONGODB_URI;
const options = { maxPoolSize: 10, serverSelectionTimeoutMS: 5_000 };

let clientPromise: Promise<MongoClient>;

if (serverEnv.NODE_ENV !== "production") {
  if (!globalThis.__mongoClientPromise) {
    globalThis.__mongoClient = new MongoClient(uri, options);
    globalThis.__mongoClientPromise = globalThis.__mongoClient.connect();
  }
  clientPromise = globalThis.__mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export { clientPromise };
