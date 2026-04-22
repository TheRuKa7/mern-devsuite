# PRD — mern-devsuite

**Owner:** Rushil Kaul · **Status:** P0 scaffold complete · **Last updated:** 2026-04-22

## 1. TL;DR

A batteries-included MERN monorepo **with compliance scaffolding baked in**:
Turborepo, Next.js 15, Express 5, MongoDB 8, Auth.js v5, Stripe, OpenTelemetry,
and an audit-log + SOC-2 CC control mapping out of the box.

## 2. Problem

MERN starters optimise for "Hello World today"; by the time the team needs
SOC-2, audit logs, GDPR exports, and webhook reconciliation, they're
retrofitting these into a codebase with the wrong primitives. `mern-devsuite`
shifts that work to day 0.

## 3. Goals

| G | Goal | Measure |
|---|------|---------|
| G1 | Day-0 tenanted app works (signup → workspace → role → invite) | E2E test green from a fresh clone |
| G2 | Stripe billing wired end-to-end with webhook reconciliation | Webhook idempotency test passes |
| G3 | Tamper-evident audit log | Hash-chain verifier catches any row mutation |
| G4 | GDPR-compliant erasure + export | Art. 17 & 20 flows pass compliance tests |
| G5 | SOC-2 CC control map | `docs/COMPLIANCE.md` references real code paths; auditor-usable |

## 4. Non-goals

- Per-industry certifications (PCI, HIPAA/BAA, FedRAMP)
- SAML / SCIM / enterprise provisioning in v1
- GraphQL-first API (we use REST + typed fetch / tRPC)

## 5. Users & stakeholders

P1–P5 in `USECASES.md`. Stakeholders include a compliance officer or fractional
vCISO who reviews the control map.

## 6. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Email+password + magic-link auth (Auth.js v5) | P0 |
| F2 | OAuth providers (Google, GitHub) pluggable | P1 |
| F3 | Workspace model with roles (owner, admin, member) | P0 |
| F4 | Invite flow via email token (expire 7 days) | P0 |
| F5 | Stripe Checkout + customer portal + subscription webhooks | P1 |
| F6 | Audit log with hash-chained rows | P0 |
| F7 | GDPR: data export (Art. 20) + erasure (Art. 17) | P1 |
| F8 | Admin console: user/workspace/plan views, feature flags | P2 |
| F9 | Zod schemas in `packages/shared/` used by both API + web | P0 |
| F10 | OpenTelemetry tracing on every request | P1 |
| F11 | Rate limit + helmet + CORS on API | P0 |
| F12 | `pnpm compliance:*` CLI for evidence export | P2 |

## 7. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| Security | Argon2id passwords; signed cookies; CSRF on mutating routes; no secrets in logs |
| Privacy | PII fields tagged in Zod; `npm run privacy:audit` lists every PII path |
| Reliability | Idempotent webhook handler (Stripe event_id dedupe); exponential-backoff email |
| Performance | API p95 < 150 ms at 200 RPS on a single `c7g.large` |
| Deployability | `docker compose up` works on Mac/Linux/Windows; Dockerfile per app |
| Observability | OTEL traces exported to console in dev, OTLP in prod |
| Accessibility | Web app passes WCAG 2.1 AA on core flows (tested via axe-ci) |

## 8. Success metrics

- **Primary:** time-to-first-working-demo from `create-mern-devsuite` (< 15 min target).
- **Secondary:** GitHub template usage count; PRs adding OAuth providers.
- **Compliance proxy:** number of SOC-2 CC controls with passing evidence test.

## 9. Milestones

| Phase | Deliverable | ETA |
|-------|-------------|-----|
| P0 | Monorepo scaffold, signup, workspace, audit hash-chain, CI | shipped |
| P1 | Stripe billing, OTEL, GDPR export/erasure, OAuth providers | +2 weeks |
| P2 | Admin console, compliance evidence CLI, feature flags, SAML stretch | +5 weeks |
| P3 | `create-mern-devsuite` generator published to npm | +7 weeks |

## 10. Dependencies

- Node 22+, pnpm 9, MongoDB 8, Redis 7
- Next.js 15, Express 5, Auth.js v5, Stripe SDK, `@opentelemetry/*`
- Testcontainers for Mongo in integration tests

## 11. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Auth.js v5 API churn | Med | Breakage | Pin minor; read release notes on each bump |
| Stripe webhook ordering / duplicates | Cert. | Bad billing state | `stripe_event_id` dedup table with TTL=30 days |
| Audit chain performance at scale | Med | Slowdown | Chunked hashing; async write path; daily anchor row |
| GDPR erasure breaks foreign keys | Med | Data corruption | Soft-delete + referential integrity tests in CI |
| Template confuses "SOC-2-ready" with "SOC-2-certified" | Low | Legal | Explicit disclaimer in README + `COMPLIANCE.md` |

## 12. Open questions

- tRPC vs typed-fetch wrapper? Lean tRPC for DX, but want runtime agility.
- Ship a seed script with realistic demo data or keep it empty? Both, toggled.
- Whether to support MySQL/Postgres adapter in v2 (i.e. stop being strictly MERN).
