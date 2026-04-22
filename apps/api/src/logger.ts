/**
 * Structured logging with pino.
 *
 * Why pino: fastest node logger, JSON by default, trivial to ship into
 * any log aggregator. In dev we pipe through `pino-pretty` by setting
 * LOG_LEVEL=debug; in prod the JSON stream goes straight to stdout and
 * the platform (Render, Fly, ECS) handles shipping.
 */
import { pino } from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "mern-devsuite-api" },
  // Redact common PII / secret fields defensively. This is an API-
  // layer safety net; the right place to redact is before logging,
  // but a belt-and-braces defence keeps tokens out of logs if someone
  // logs a whole request object by mistake.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "*.password",
      "*.passwordHash",
      "*.token",
    ],
    censor: "[redacted]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
