/**
 * Typed environment loader.
 *
 * Fail fast at startup instead of discovering a missing secret three
 * requests into the first deploy. We validate with zod and freeze the
 * result — every other module reads from this object rather than
 * touching `process.env` directly.
 */
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGO_URI: z
    .string()
    .min(1)
    .default("mongodb://localhost:27017/mern-devsuite"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),

  // Auth.js signs JWTs with this; the API verifies using the same secret.
  // In production use a 32+ byte random string and store it in the secret
  // manager of your hosting provider, never in source.
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 chars in every env"),

  // When true, /gdpr/delete is a hard purge rather than a 30-day soft
  // delete. Keep false in production — the grace window exists so a
  // user can cancel a mistaken deletion request.
  GDPR_HARD_DELETE: z
    .preprocess((v) => String(v) === "true", z.boolean())
    .default(false),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Don't use the logger here — it depends on env. Plain stderr is
    // the right floor for a config-error fatal.
    // eslint-disable-next-line no-console
    console.error(
      "[env] invalid configuration:\n" +
        JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    process.exit(1);
  }
  return Object.freeze(parsed.data);
}

export const env = loadEnv();
