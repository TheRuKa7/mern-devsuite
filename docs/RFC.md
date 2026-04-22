# RFC-001 — mern-devsuite monorepo + compliance architecture

**Author:** Rushil Kaul · **Status:** Draft · **Target release:** P1–P2

## 1. Summary

Turborepo monorepo with three apps (`api`, `web`, `workers`) and shared
packages (`shared`, `ui`, `config`). Auth via Auth.js v5 JWT sessions. Billing
via Stripe with a dedup-table webhook handler. Audit log is a hash-chain with a
verifier CLI. GDPR flows sit in a dedicated `privacy` domain package.

## 2. Context

See `PRD.md` for goals; `USECASES.md` for flows. This RFC pins the monorepo
layout, schemas, critical flows (signup, billing webhook, audit write), and
the GDPR flows.

## 3. Detailed design

### 3.1 Monorepo layout

```
mern-devsuite/
├─ apps/
│  ├─ api/                   Express 5 (REST + tRPC adapter)
│  ├─ web/                   Next.js 15 (App Router, RSC)
│  └─ workers/               BullMQ consumers (email, erasure, reconcile)
├─ packages/
│  ├─ shared/                Zod schemas, TS types, constants
│  ├─ ui/                    React components, Tailwind, design tokens
│  ├─ db/                    Mongoose models + migrations
│  ├─ privacy/               GDPR export/erasure engines
│  ├─ audit/                 hash-chain writer + verifier
│  └─ config/                eslint, tsconfig, turbo configs
├─ docs/
└─ scripts/compliance/       evidence exporters per CC control
```

### 3.2 Key Zod schemas (`packages/shared`)

```ts
export const User = z.object({
  _id: z.string(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  createdAt: z.date(),
}).describe("User");

export const Workspace = z.object({
  _id: z.string(),
  name: z.string().min(1),
  plan: z.enum(["free","pro","team","enterprise"]),
  stripeCustomerId: z.string().nullish(),
  stripeSubscriptionId: z.string().nullish(),
});

export const Role = z.enum(["owner","admin","member"]);
export const Membership = z.object({ userId: z.string(), workspaceId: z.string(), role: Role });

export const AuditEvent = z.object({
  _id: z.string(),
  at: z.date(),
  actor: z.string().nullish(),          // user id, or "system"
  ip: z.string().nullish(),
  userAgent: z.string().nullish(),
  action: z.string(),                   // e.g. "workspace.plan_changed"
  resource: z.object({ kind: z.string(), id: z.string() }),
  before: z.record(z.unknown()).nullish(),
  after: z.record(z.unknown()).nullish(),
  prevHash: z.string(),                 // SHA-256 of previous row
  rowHash: z.string(),                  // SHA-256 of this row (excluding rowHash)
});
```

### 3.3 Audit log — hash chain

Write path:

```ts
export async function writeAuditEvent(evt: Omit<AuditEvent,"_id"|"prevHash"|"rowHash">) {
  return db.transaction(async (sess) => {
    const prev = await db.AuditEvent.findOne({}, { rowHash: 1 }).sort({ at: -1 }).session(sess);
    const prevHash = prev?.rowHash ?? GENESIS_HASH;
    const rowHash = sha256(canonicalJson({ ...evt, prevHash }));
    return db.AuditEvent.create([{ ...evt, prevHash, rowHash }], { session: sess });
  });
}
```

Verifier CLI:

```
pnpm audit:verify [--since=ISO_DATE]
  exits 0 if every row's rowHash == sha256(canonical(row excluding rowHash))
  exits 1 and prints the first broken row otherwise
```

### 3.4 Stripe webhook handler

```ts
app.post("/webhooks/stripe", raw, async (req, res) => {
  const sig = req.header("stripe-signature")!;
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, sig, SECRET); }
  catch { return res.sendStatus(400); }

  const dup = await db.StripeEvent.findOne({ _id: event.id });
  if (dup) return res.sendStatus(200);          // idempotent

  await db.StripeEvent.create({ _id: event.id, type: event.type, at: new Date() });

  switch (event.type) {
    case "customer.subscription.updated": await reconcileSubscription(event); break;
    case "customer.subscription.deleted": await downgradeWorkspace(event); break;
    case "invoice.payment_failed":         await flagDunning(event); break;
  }
  await writeAuditEvent({ action: `billing.${event.type}`, ... });
  res.sendStatus(200);
});
```

### 3.5 GDPR flows

- **Export (Art. 20)**: `GET /me/export` enqueues a `privacy.export` job; worker
  collects all user-owned rows + audit trail, signs a zip, stores in
  object-store with a 7-day signed URL, emails the link.
- **Erasure (Art. 17)**: `POST /me/erase` enqueues `privacy.erase` with a
  grace period (default 7 days) during which the user can cancel. On cron,
  redact user PII fields (Zod schema `.describe("pii")` used to discover them),
  remove memberships, rewrite `before/after` blobs in audit trail to redact
  PII while keeping the hash chain intact (a *separate* redaction receipt row
  points to the original hash).

### 3.6 Authentication

- Auth.js v5 JWT sessions; secret rotated via `AUTH_SECRET_V2` env.
- Password hashing: Argon2id with tuned cost per `libsodium` recommendations.
- Magic-link tokens: 15-min TTL, single-use, rate-limited per-IP.
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`.

### 3.7 Observability

- OTEL instrumentation in `apps/api/src/otel.ts` (auto-instrument express,
  mongoose, redis, stripe).
- `request_id` generated at edge; propagated to workers via BullMQ job metadata.
- Structured JSON logs via `pino`; never log Authorization or cookie headers.

### 3.8 Testing strategy

- Unit: `vitest`.
- Integration: Testcontainers spin up real Mongo + Redis; tests hit the Express
  app via `supertest`.
- E2E: `playwright` drives the web app against a seeded API.
- Compliance: dedicated `tests/compliance/` suite — audit chain integrity,
  webhook idempotency, erasure completeness, export manifest correctness.

## 4. Alternatives considered

| Alt | Why not |
|-----|---------|
| NestJS instead of Express | Heavy; boiler-friendly but obscures the "just Node" ethos |
| Postgres via Prisma | Template would be PERN, not MERN; separate fork viable |
| Clerk / Supabase Auth | Great DX; removes a learning surface. We want Auth.js for "own the auth layer" stance |
| Event-sourced audit log | Over-engineered for 95% of SaaS; hash chain is enough |
| Nx monorepo | Turborepo is simpler and matches team size |

## 5. Tradeoffs

- Hash-chain audit prevents undetected tampering but does **not** prevent a
  privileged attacker from rewriting *everything*. For that we'd anchor daily
  hashes to an external source (S3 Object Lock, or a public tx). Listed in P3.
- Monorepo adds tooling overhead (turbo config, lint-staged, etc.) but the
  shared Zod story is too valuable to skip.

## 6. Rollout plan

1. P0 (shipped): monorepo, auth, workspaces, audit chain, CI.
2. P1: Stripe, OTEL, GDPR flows, OAuth.
3. P2: admin console + compliance evidence CLI.
4. P3: `create-mern-devsuite` generator on npm.

## 7. Open questions

- Anchor audit chain daily to an external source (e.g., OpenTimestamps)? Worth it.
- Multi-region DB strategy? Not in v1; single-region with daily backups suffices.
- Ship a built-in feature-flag service or integrate GrowthBook? Leaning GrowthBook.
