# USECASES — mern-devsuite

A compliance-aware MERN-stack starter. Covers the "day-1 to day-90" journey of
a B2B SaaS team that wants auth, billing, audit logs, and SOC-2/GDPR hygiene
baked in from the start.

## 1. Personas

| ID | Persona | Context | Primary JTBD |
|----|---------|---------|--------------|
| P1 | **Solo founder (Priya)** | Day-0 B2B SaaS idea; needs working auth + billing + workspaces in a weekend | "Give me a tenanted web app that I can demo to design partners Monday" |
| P2 | **Staff engineer (Marco)** | Migrating an ageing Express-4 app to a modern monorepo | "Show me a Turborepo layout I can steal; I'll port our domain logic in" |
| P3 | **Security lead (Dhara)** | Scoping SOC-2 readiness for a 12-person team | "Does this template produce an audit log I can hand to an auditor?" |
| P4 | **Compliance consultant (Omar)** | Helps SaaS teams prep for SOC-2 / GDPR | "Map each repo feature to a SOC-2 control; make my life easy" |
| P5 | **Front-end dev (Sophie)** | Wants to wire one feature without reading 50 files | "Where does a new `/settings/billing` page go and how do I ship it?" |

## 2. Jobs-to-be-done

JTBD-1. **Bootstrap** a tenanted SaaS (users → workspaces → roles → invites).
JTBD-2. **Billing** via Stripe Checkout + customer portal + webhook reconciliation.
JTBD-3. **Audit log** every sensitive mutation, tamper-evident.
JTBD-4. **GDPR dossier**: export all user data (Art. 20) and delete on request (Art. 17).
JTBD-5. **Ship a feature** on both API + web with shared Zod schemas.
JTBD-6. **Compliance evidence**: generate artefacts for SOC-2 CC controls.

## 3. End-to-end flows

### Flow A — Priya boots a tenanted SaaS in an afternoon

1. `pnpm dlx create-mern-devsuite my-saas` → monorepo scaffolded.
2. `pnpm dev` boots API + Next app + Mongo + Redis in Docker Compose.
3. Signs up at `localhost:3000/signup`, is auto-placed in a new workspace as `owner`.
4. Invites a teammate via email (Mailhog in dev); teammate joins as `member`.
5. Clicks "Upgrade", Stripe Checkout test flow issues a subscription; webhook
   writes the new plan to the workspace.
6. Priya screenshots the dashboard, sends it to design partners.

### Flow B — Marco ports domain logic into the monorepo

1. Clones template, reads `docs/ARCHITECTURE.md`.
2. Adds new domain package under `packages/billing-core/`.
3. Imports Zod schemas from `packages/shared/` so both API and web validate identically.
4. Wires a new API route in `apps/api/src/routes/`; Turborepo caches incremental builds.
5. Runs `pnpm test` — integration tests use Mongo via Testcontainers.

### Flow C — Dhara asks "what does an auditor see?"

1. Dhara opens `docs/COMPLIANCE.md` — SOC-2 CC control table (CC6, CC7, CC8).
2. Runs `pnpm compliance:export --control CC6.1` → dumps policy + code references.
3. Views audit log: every `UPDATE workspaces SET plan=...` has a row with actor, IP,
   user agent, previous value, new value, and a signed hash chain.
4. Confirms chain integrity with `pnpm audit:verify`.

### Flow D — Omar maps SOC-2 CC controls

1. Opens `docs/COMPLIANCE.md`; control matrix references exact file paths.
2. Follows `CC7.2 — audit of logical access` → `apps/api/src/middleware/audit.ts`
   + the hash-chain verifier.
3. Writes auditor memo: "Control CC7.2 implemented; verified by test
   `apps/api/tests/audit.chain.test.ts`".

### Flow E — GDPR right-to-erasure

1. User submits form at `/settings/privacy/delete`.
2. API enqueues a `user.erasure` job with 7-day grace window.
3. Cron worker on day 8 deletes PII, rewrites audit rows to redact personal
   fields while preserving hash integrity.
4. Confirmation email sent; compliance log records the request + completion.

### Flow F — Sophie adds a billing settings page

1. Creates `apps/web/src/app/settings/billing/page.tsx`.
2. Uses `trpc` / typed fetch to call `api.billing.portal.create`.
3. Reads `packages/shared/src/billing.ts` for type contracts.
4. Ships behind a feature flag; flip on per workspace via admin console.

## 4. Acceptance scenarios

```gherkin
Scenario: Signup creates a workspace and audit rows
  When a user signs up with email
  Then a workspace is created with the user as "owner"
  And audit_events contains a "user.created" and "workspace.created" row

Scenario: Stripe webhook reconciles the plan
  Given a workspace on "free"
  When Stripe emits "customer.subscription.updated" to price=PRO
  Then the workspace plan becomes "pro" within 5 seconds
  And an audit_event "billing.plan_changed" is written

Scenario: GDPR data export contains all personal data
  When I GET /me/export as an authenticated user
  Then I receive a signed zip with profile, workspaces, invites, audit trail
  And the manifest.sha256 matches the file digest

Scenario: Audit chain integrity detects tampering
  Given 100 audit_events
  When I mutate one row's "after" JSON in Mongo
  Then `pnpm audit:verify` exits non-zero and names the broken row
```

## 5. Non-use-cases

- Enterprise-grade SAML SSO with IdP-provisioning (SCIM) — v2, not baseline
- PCI-DSS (we never touch card data; Stripe does)
- HIPAA-covered entity usage (template mentions BAA gaps; not pre-certified)
