# /ultraplan — mern-devsuite

## Goal
Ship a production-grade MERN B2B SaaS starter in ~12 days. Must clone-and-run in 5 minutes.

## Phases

### P0 — Scaffold (Days 1-2)
- [x] Turborepo + pnpm workspaces
- [x] apps/web (Next.js 15), apps/api (Express 5)
- [x] packages/shared (zod), packages/ui (shadcn)
- [x] Docker compose (Mongo 8 + otel-collector + jaeger)
- [x] CI (lint + typecheck + test)
- [x] Docs: RESEARCH, PLAN, THINK, COMPLIANCE

### P1 — Auth (Days 3-4)
- [ ] Auth.js v5 with MongoDB adapter
- [ ] Email magic-link + Google OAuth + GitHub OAuth
- [ ] Session rotation, device list, sign-out-all
- [ ] /register, /login, /verify, /forgot-password
- [ ] E2E tests in Playwright

### P2 — Teams & RBAC (Days 5-6)
- [ ] Workspace model + invitations
- [ ] Role model (owner, admin, member, guest)
- [ ] `requireRole` middleware
- [ ] /team, /team/members, /team/invites UI

### P3 — Payments (Days 7-8)
- [ ] Stripe subscriptions: free, pro, team
- [ ] Checkout + customer portal
- [ ] Webhook handler with idempotency + signature verify
- [ ] Metered billing example (API calls)

### P4 — Observability & Compliance (Days 9-10)
- [ ] OpenTelemetry auto-instrumentation → OTLP
- [ ] Audit log middleware (writes to `audit_logs` capped collection)
- [ ] GDPR /export (zip of user data) and /delete endpoints
- [ ] Sentry integration
- [ ] Feature flags via LaunchDarkly OSS equivalent (Flagsmith open) or custom

### P5 — Polish & release (Days 11-12)
- [ ] Demo dashboard page
- [ ] Seed script + sample data
- [ ] Deploy docs (Vercel + Render + Mongo Atlas)
- [ ] Renovate bot config
- [ ] v1.0.0 release

## Acceptance
- ✅ `pnpm install && pnpm dev` works from fresh clone
- ✅ Complete auth flow (sign up → verify → team create → invite → pay)
- ✅ Audit log visible at /admin/audit
- ✅ CI green on main
- ✅ Lighthouse perf > 90 on landing page
