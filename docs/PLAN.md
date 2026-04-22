# /ultraplan — mern-devsuite

## Goal
Ship a production-grade MERN B2B SaaS starter. Must clone-and-run in 5 minutes.

## Phases

### P0 — Scaffold ✅
- [x] Turborepo + pnpm workspaces
- [x] apps/web (Next.js 15), apps/api (Express 5)
- [x] packages/config (shared tsconfig + eslint), packages/shared (zod), packages/ui (shadcn-style)
- [x] Docker compose (Mongo 8)
- [x] CI (install + typecheck + lint + test — `|| true` fallbacks removed)
- [x] Docs: RESEARCH, PLAN, THINK, COMPLIANCE

### P1 — Auth ✅
- [x] Auth.js v5 (Credentials provider) with MongoDB adapter
- [x] Express `/api/auth/register` — bcrypt cost 12, Zod-validated, seeds default workspace + owner membership
- [x] Express `/api/auth/verify` — timing-safe (dummy bcrypt compare for missing users) to prevent email enumeration
- [x] JWT session strategy (HS256, shared AUTH_SECRET) — Auth.js signs, Express verifies
- [x] `requireAuth` middleware — `alg:none` rejected, user re-read from Mongo each request
- [x] Sign-in + sign-up pages with server actions
- [ ] Email magic-link + Google OAuth + GitHub OAuth (optional — Credentials works standalone)
- [ ] Device list / sign-out-all (nice-to-have)

### P2 — Teams & RBAC ✅ (core)
- [x] Workspace + Membership + Project models
- [x] Role ladder: owner (3) > admin (2) > member (1) > guest (0)
- [x] `requireWorkspace(minRole)` middleware — 404 on non-membership to prevent enumeration
- [x] Workspaces CRUD (`POST /`, `GET /:id`, `GET /:id/members`)
- [x] Projects CRUD scoped to workspace — `PATCH` for members, `DELETE` for admins
- [x] Dashboard → projects UI with server-action create flow
- [ ] Invite-by-email flow (nice-to-have)
- [ ] /team/members UI for role management (nice-to-have)

### P3 — Payments (deferred)
- [ ] Stripe subscriptions: free, pro, team
- [ ] Checkout + customer portal
- [ ] Webhook handler with idempotency + signature verify

Stripe is scaffolded (`.env.example` has the keys) but intentionally
unimplemented — payments are easy to add once auth + tenancy exist.

### P4 — Observability & Compliance ✅
- [x] Audit log middleware with **linear hash chain** (sha256(prev || canonical(payload)))
- [x] `verifyChain()` — walks log, returns first break + seq — SOC-2 CC7.2 control
- [x] `/api/audit/verify` endpoint for cron-driven integrity checks
- [x] `/api/workspaces/:id/audit` — admin-only event list
- [x] GDPR `/export` — Art. 15 + 20, streams JSON bundle with `Content-Disposition`
- [x] GDPR `/delete` — Art. 17, soft-delete with tombstone email + 30-day grace
- [x] Pre-mutation audit ordering (failed deletes still leave a trail)
- [x] pino-http with PII redaction (`authorization`, `cookie`, `password`, `passwordHash`, `token`)
- [x] Docs: SOC2.md, GDPR.md, INCIDENT_RESPONSE.md, PRIVACY_POLICY.md, DPA.md
- [ ] OpenTelemetry auto-instrumentation (packages installed; wire OTLP when you pick a vendor)
- [ ] Sentry (env var reserved; slot in via `sentry/init.ts`)

### P5 — Polish & release
- [x] Landing page with auth-aware CTA
- [x] Dashboard + projects + settings UIs
- [x] README with architecture diagram + quickstart
- [x] Integration tests (audit chain + auth flow) on in-memory Mongo
- [ ] Seed script + sample data
- [ ] Deploy docs (Vercel + Render + Mongo Atlas runbook)
- [ ] Renovate bot config
- [ ] v1.0.0 release

## Acceptance

- ✅ `pnpm install && pnpm dev` works from fresh clone
- ✅ Sign-up → default workspace → create project → audit event recorded
- ✅ `/api/audit/verify` returns `{ok: true}` on a clean database
- ✅ GDPR export + delete self-serve from Settings
- ✅ CI green on main (no `|| true` escape hatches)
- [ ] Lighthouse perf > 90 on landing page (untested)
- [ ] Deployed demo at `mern-devsuite.vercel.app` (TODO)

## What changed since the original plan

| Original intent | Shipped | Why |
|---|---|---|
| Capped audit collection | Regular collection + hash chain | Capped collections can't be updated; hash chain gives tamper detection *plus* full CRUD-safety for GDPR export. |
| Email magic link as primary | Credentials primary, OAuth deferred | Credentials is the worst-case flow; if that's solid, OAuth is trivial to add. |
| "SOC-2 prep hooks" | Full SOC-2 control matrix | The hooks weren't useful without the doc explaining *which* control each one satisfies. |
