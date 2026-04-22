/**
 * Express 5 application factory.
 *
 * Kept as a factory (not a singleton) so tests can mount fresh
 * instances without restarting the process. `app.ts` builds the
 * middleware stack; `index.ts` is the actual server bootstrap.
 */
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { workspacesRouter } from "./routes/workspaces.js";
import { projectsRouter } from "./routes/projects.js";
import { gdprRouter } from "./routes/gdpr.js";
import { auditRouter } from "./routes/audit.js";

export function createApp(): Express {
  const app = express();

  // --- Security + hygiene middleware ---------------------------------

  // `trust proxy` is required so req.ip reflects the real client when
  // the app runs behind a TLS terminator (Render, Fly, Vercel, nginx).
  // "loopback, linklocal, uniquelocal" is the safe default — trusts
  // only private addresses, not arbitrary X-Forwarded-For headers.
  app.set("trust proxy", "loopback, linklocal, uniquelocal");

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    }),
  );
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
      // Skip healthcheck noise.
      autoLogging: {
        ignore: (req) => req.url === "/healthz",
      },
    }),
  );

  // Global default. Sensitive routes layer on stricter limits.
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // --- Public endpoints ----------------------------------------------

  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "mern-devsuite-api" });
  });

  app.get("/", (_req: Request, res: Response) => {
    res.json({
      service: "mern-devsuite-api",
      repo: "https://github.com/TheRuKa7/mern-devsuite",
      routes: [
        "POST /api/auth/register",
        "POST /api/auth/verify",
        "GET  /api/me",
        "POST /api/workspaces",
        "GET  /api/workspaces/:id",
        "GET  /api/workspaces/:id/members",
        "GET  /api/workspaces/:id/projects",
        "POST /api/workspaces/:id/projects",
        "PATCH /api/workspaces/:id/projects/:pid",
        "DELETE /api/workspaces/:id/projects/:pid",
        "GET  /api/gdpr/export",
        "DELETE /api/gdpr/delete",
        "GET  /api/audit/verify",
      ],
    });
  });

  // --- Tighter rate limit on auth routes -----------------------------

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // --- API routes ----------------------------------------------------

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/workspaces", workspacesRouter);
  app.use("/api/workspaces/:workspaceId/projects", projectsRouter);
  app.use("/api/gdpr", gdprRouter);
  app.use("/api", auditRouter);

  // --- Error handler (must be last) ----------------------------------

  app.use(errorHandler);

  return app;
}
