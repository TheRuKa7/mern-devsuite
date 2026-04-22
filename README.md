# mern-devsuite

> **Production-ready MERN template for B2B SaaS.** MongoDB 8 · Express 5 ·
> React 19 · Node 22+ · Next.js 15. Ships with auth, multi-tenancy,
> observability hooks, and a SOC-2 / GDPR compliance layer most
> templates skip.

[![CI](https://github.com/TheRuKa7/mern-devsuite/actions/workflows/ci.yml/badge.svg)](https://github.com/TheRuKa7/mern-devsuite/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Built by [Rushil Kaul](https://github.com/TheRuKa7). An opinionated
starter — what Day 1 of a real B2B SaaS should actually look like.

## What you get on commit 1

Most MERN starters skip the boring-but-load-bearing parts. This one
doesn't:

- **Workspaces + RBAC** — owner / admin / member / guest ladder, enforced
  by an `requireWorkspace(role)` middleware. Retrofitting later is painful;
  this template bakes it in.
- **Shared JWT identity across two surfaces** — Auth.js v5 on Next, HS256
  JWT the Express API verifies with the *same* `AUTH_SECRET`. No
  cross-domain cookie gymnastics.
- **Tamper-evident audit log** — linear sha256 hash chain. `verifyChain()`
  walks the log and returns the first break. This is your SOC-2 CC7.2
  detective control, not a log file.
- **GDPR Art. 15 + 17 + 20** — self-serve JSON export, soft-delete with
  30-day grace, pre-mutation audit trail. Flip one env var for hard-delete.
- **Hardened defaults** — `helmet`, strict CORS, rate limits (120/min
  global, 10/min on auth), password hashing at OWASP cost 12, timing-safe
  auth responses that don't enumerate emails.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | Turborepo + pnpm | Fast, standard |
| Frontend | Next.js 15 (App Router + RSC) | Server Actions, edge-ready |
| API | Express 5 | Async-native, keeps the "E" in MERN |
| DB | MongoDB 8 + Mongoose 8 | Atlas, flexible schemas |
| Auth | Auth.js v5 (beta) + jose | JWT sessions, OAuth-ready |
| Validation | Zod + TypeScript | Runtime + compile-time parity |
| Logging | pino + pino-http | Structured JSON, PII-redacted |
| Tests | Vitest + supertest + mongodb-memory-server | Fast integration tests |
| UI | Tailwind v4 + shadcn-style primitives (`packages/ui`) | Accessible, themeable |

## Repo layout

```
mern-devsuite/
├── apps/
│   ├── api/                Express 5 API (TypeScript)
│   │   ├── src/
│   │   │   ├── app.ts          Factory: middleware + routes
│   │   │   ├── index.ts        Bootstrap (DB + graceful shutdown)
│   │   │   ├── db/             Mongoose models + connection
│   │   │   ├── middleware/     auth.ts, workspace.ts, error.ts
│   │   │   ├── routes/         auth, me, workspaces, projects, gdpr, audit
│   │   │   └── services/       audit.ts (hash chain)
│   │   └── tests/              audit.test.ts, auth.test.ts
│   └── web/                 Next 15 app
│       ├── src/
│       │   ├── auth.ts         Auth.js v5 config
│       │   ├── middleware.ts   Protect /dashboard, /settings
│       │   ├── lib/api.ts      JWT-signing proxy to the API
│       │   └── app/            Landing, sign-in/up, dashboard, settings
├── packages/
│   ├── config/             Shared tsconfig + eslint
│   ├── shared/             Zod schemas, DTOs, enums
│   └── ui/                 Button / Input / Card / Alert primitives
├── docs/
│   ├── SOC2.md             Control matrix
│   ├── GDPR.md             Rights mapping + deletion lifecycle
│   ├── INCIDENT_RESPONSE.md 72-hour clock runbook
│   ├── PRIVACY_POLICY.md   Customer-facing template
│   └── DPA.md              Processor agreement template
└── .github/workflows/ci.yml
```

## Quickstart

```bash
# 0. Prereqs
#    Node ≥ 22, pnpm 9, Docker (for local Mongo)

# 1. Install
pnpm install

# 2. Start Mongo
docker compose up -d mongo

# 3. Configure
cp .env.example .env
#    Edit AUTH_SECRET (`openssl rand -hex 32`) and MONGO_URI.
#    Both apps/api and apps/web read from this file via dotenv.

# 4. Run
pnpm dev
#    Turbo launches web (:3000) and api (:4000) concurrently.

# 5. Verify
curl http://localhost:4000/healthz     # {"status":"ok", ...}
open http://localhost:3000             # landing page
```

## Architecture in one diagram

```
                    ┌─────────────────────────┐
  Browser  ────────►│  Next 15 (Vercel)       │
                    │  • Auth.js v5 (cookies) │
                    │  • RSC + Server Actions │
                    │  • Signs JWT w/ AUTH_SECRET
                    └──────────────┬──────────┘
                                   │  Authorization: Bearer <HS256 JWT>
                                   ▼
                    ┌─────────────────────────┐
                    │  Express 5 (Render/Fly) │
                    │  • Verifies JWT         │
                    │  • Mongoose → Mongo     │
                    │  • Audit hash chain     │
                    └──────────────┬──────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  MongoDB 8 (Atlas)      │
                    │  users / workspaces /   │
                    │  memberships / projects │
                    │  auditEvents            │
                    └─────────────────────────┘
```

Only the Next app sets a browser cookie. Server-rendered Next code mints
a 60-second HS256 token on the fly and hands it to the API — the API
never sees the cookie, the browser never sees the JWT.

## Scripts

```bash
pnpm dev         # turbo run dev  (web + api in parallel)
pnpm build       # all workspaces
pnpm test        # vitest across workspaces
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint / next lint
```

## Compliance — what's in vs. out

| What the code gives you | What you still owe your auditor |
|---|---|
| SOC-2 CC6.x — auth, RBAC, rate limits, password hashing | Written security policy, access reviews, training records |
| SOC-2 CC7.2 — tamper-evident audit chain + daily verify | Real on-call rotation, pager integration |
| GDPR Art. 15 / 17 / 20 endpoints | Customer-facing privacy policy, DPAs with each subprocessor |
| CC6.7 transport encryption | TLS config at the edge (Vercel, Render, nginx) |

See [`docs/SOC2.md`](./docs/SOC2.md) and [`docs/GDPR.md`](./docs/GDPR.md)
for the full mapping.

## Docs

- [`docs/SOC2.md`](./docs/SOC2.md) — control matrix with file references
- [`docs/GDPR.md`](./docs/GDPR.md) — rights mapping and deletion lifecycle
- [`docs/INCIDENT_RESPONSE.md`](./docs/INCIDENT_RESPONSE.md) — runbook with GDPR 72h clock
- [`docs/PRIVACY_POLICY.md`](./docs/PRIVACY_POLICY.md) — starter policy (needs legal review)
- [`docs/DPA.md`](./docs/DPA.md) — data processing addendum template
- [`docs/PLAN.md`](./docs/PLAN.md) — phase tracker
- [`docs/THINK.md`](./docs/THINK.md) — design decisions + non-goals
- [`docs/RESEARCH.md`](./docs/RESEARCH.md) — competitive scan

## Testing

```bash
pnpm --filter @mern-devsuite/api test
```

Integration tests boot an in-memory Mongo (`mongodb-memory-server`) and
hit the real Express app via `supertest`. Specifically covered:

- **Hash chain** (`tests/audit.test.ts`) — tamper / deletion / concurrent
  appends all detected by `verifyChain()`.
- **Auth flow** (`tests/auth.test.ts`) — registration, duplicate rejection,
  timing-safe login, JWT validation, `alg:none` downgrade rejection, expiry.

## License

MIT. See [LICENSE](./LICENSE).
