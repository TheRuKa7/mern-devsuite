/**
 * Centralised error handler.
 *
 * Route handlers `throw` or `next(err)` — this middleware decides the
 * response shape. Zod errors become 400 with field-level details;
 * duplicate-key Mongo errors become 409; anything else is a 500 that
 * logs the full error but returns a generic message (never leak stack
 * traces to clients).
 */
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../logger.js";

interface MongoLikeError {
  name?: string;
  code?: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKey(err: unknown): err is MongoLikeError {
  const e = err as MongoLikeError;
  return !!e && e.name === "MongoServerError" && e.code === 11000;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "bad_request",
        message: "validation failed",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (isDuplicateKey(err)) {
    res.status(409).json({
      error: {
        code: "conflict",
        message: "duplicate value",
        details: err.keyValue,
      },
    });
    return;
  }

  logger.error({ err }, "unhandled error");
  res.status(500).json({
    error: {
      code: "internal",
      message: "internal server error",
    },
  });
};
