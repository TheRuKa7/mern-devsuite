# mern-devsuite

> **Production-ready MERN template for B2B SaaS.** MongoDB 8 · Express 5 · React 19 · Node 25 · Next.js 15. Ships with auth, payments, multi-tenancy, observability, and a compliance/audit layer most templates skip.

[![CI](https://github.com/TheRuKa7/mern-devsuite/actions/workflows/ci.yml/badge.svg)](https://github.com/TheRuKa7/mern-devsuite/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Built by [Rushil Kaul](https://github.com/TheRuKa7). A portfolio rebuild of 2021–22 MERN experiments, re-architected as an opinionated starter — what Day 1 of any real B2B SaaS should actually look like.

## Why this over `create-t3-app`?

Three things most templates skip, wired in from commit 1:
1. **Multi-tenancy (teams/workspaces)** — retrofitting later is painful
2. **OpenTelemetry tracing** — OTLP-ready, not just console logs
3. **Compliance layer** — audit log middleware, GDPR export/delete endpoints, SOC-2-prep hooks

Plus: opinionated on Mongo specifically (where t3 leaves DB open-ended).

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | Turborepo + pnpm | Fast, standard |
| Frontend | Next.js 15 app router + RSC | SSR + Server Actions |
| API | Express 5 (async-native) | Preserves MERN, simple |
| DB | MongoDB 8 + Mongoose 8 | Native vector search, TS types |
| Auth | Auth.js v5 (NextAuth) | OAuth + email + session rotation |
| Payments | Stripe + webhooks | Subscriptions + metered billing |
| UI | shadcn/ui + Tailwind v4 | Accessible, customizable |
| Tests | Vitest + supertest + Playwright | Unit + integration + e2e |
| Tracing | OpenTelemetry → OTLP | Vendor-neutral |
| Errors | Sentry | Standard |

## Docs

- [docs/RESEARCH.md](./docs/RESEARCH.md) — 2026 MERN landscape + competitive scan
- [docs/PLAN.md](./docs/PLAN.md) — phased build plan
- [docs/THINK.md](./docs/THINK.md) — design decisions, differentiators, risks
- [docs/COMPLIANCE.md](./docs/COMPLIANCE.md) — audit trail, GDPR endpoints, SOC-2 mapping

## Quickstart

```bash
pnpm install
docker compose up -d mongo
cp .env.example .env.local   # fill in Stripe + OAuth keys
pnpm dev                     # turbo runs web + api in parallel
```

## License

MIT.
