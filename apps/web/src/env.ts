/**
 * Typed env for the web app.
 *
 * We split server-only and client-safe variables explicitly. Anything
 * exposed via `NEXT_PUBLIC_` is readable by anyone — keep secrets out.
 */
import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Shared with the API — Auth.js JWTs are HS256-signed with this.
  AUTH_SECRET: z.string().min(16),

  // The Express API root. The web proxies workspace/project/GDPR calls
  // through server components that pass the minted JWT along.
  API_URL: z.string().url().default("http://localhost:4000"),

  // MongoDB connection for the Auth.js adapter. In most deploys this
  // is the same cluster the API uses.
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://localhost:27017/mern-devsuite"),
});

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("mern-devsuite"),
});

function load<T extends z.ZodTypeAny>(schema: T, source: unknown): z.infer<T> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    // eslint-disable-next-line no-console
    console.error("[env] invalid configuration:", flat);
    throw new Error("invalid env — see logs");
  }
  return parsed.data;
}

export const serverEnv = load(ServerEnvSchema, process.env);
export const publicEnv = load(PublicEnvSchema, {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
