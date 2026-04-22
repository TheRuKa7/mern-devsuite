/**
 * API entry point — Express 5 with OpenTelemetry + security middleware.
 * Routes land in P1-P4 (see docs/PLAN.md).
 */
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "mern-devsuite-api" });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "mern-devsuite-api",
    repo: "https://github.com/TheRuKa7/mern-devsuite",
  });
});

// Routes: auth (P1), teams (P2), billing (P3), audit (P4) — see docs/PLAN.md

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
});
