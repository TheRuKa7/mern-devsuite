# DFD — mern-devsuite

## Level 0 — Context

```mermaid
flowchart LR
  U[User / Admin]
  S[Stripe]
  E[Email provider<br/>Resend / Postmark]
  O[OTEL collector]
  A((mern-devsuite<br/>API + Web + Workers))
  DB[(Mongo 8<br/>Redis 7<br/>S3)]

  U -- HTTPS --> A
  A -- JWT session --> U
  S -- webhooks / portal redirects --> A
  A -- checkout URLs / portal URLs --> S
  A -- transactional email --> E
  A -- traces + metrics --> O
  A <--> DB
```

## Level 1 — Service decomposition

```mermaid
flowchart TD
  subgraph Frontend
    NEXT[1.0 Next.js 15<br/>App Router + RSC]
  end

  subgraph API
    AUTH[2.0 Auth.js v5]
    ROUTES[2.1 REST + tRPC routes]
    MW[2.2 Middleware<br/>helmet / rate-limit / audit / OTEL]
  end

  subgraph Workers
    EM[3.0 Email worker]
    ERAS[3.1 Erasure worker<br/>grace-period sweeper]
    REC[3.2 Billing reconciler]
  end

  subgraph Domain["Shared domain (packages)"]
    SH[packages/shared<br/>Zod schemas]
    DBM[packages/db<br/>Mongoose models]
    AUD[packages/audit<br/>hash-chain writer]
    PRIV[packages/privacy<br/>GDPR engines]
  end

  subgraph Stores
    MDB[[Mongo]]
    RDS[[Redis<br/>BullMQ]]
    S3[[Object store<br/>exports + clip evidence]]
  end

  NEXT -- fetch / tRPC --> ROUTES
  ROUTES --> AUTH
  ROUTES --> MW
  MW --> AUD
  AUD --> MDB
  ROUTES --> DBM
  DBM --> MDB
  ROUTES -- enqueue --> RDS
  RDS --> EM & ERAS & REC
  ERAS --> PRIV --> MDB
  PRIV --> S3
  REC --> MDB
```

## Level 2 — Signup to first audit row

```mermaid
sequenceDiagram
  autonumber
  participant U as User (browser)
  participant W as Next.js
  participant A as API
  participant DB as Mongo
  U->>W: POST /api/auth/signup
  W->>A: signup {email, password}
  A->>A: Argon2id hash
  A->>DB: insert user
  A->>DB: insert workspace (owner=user)
  A->>DB: insert membership
  loop inside a transaction
    A->>DB: read latest AuditEvent.rowHash
    A->>DB: insert AuditEvent(action="user.created", prevHash, rowHash)
    A->>DB: insert AuditEvent(action="workspace.created", prevHash, rowHash)
  end
  A-->>W: set JWT session cookie
  W-->>U: redirect to /dashboard
```

## Level 2 — Stripe webhook reconciliation

```mermaid
sequenceDiagram
  autonumber
  participant S as Stripe
  participant A as API
  participant D as Mongo
  participant Q as BullMQ
  participant R as Reconciler worker
  S->>A: POST /webhooks/stripe (signed)
  A->>A: verify signature
  A->>D: dedup check on event.id
  alt first time
    A->>D: insert StripeEvent
    A->>Q: enqueue billing.reconcile(event)
    A-->>S: 200
    Q->>R: job
    R->>D: update workspace.plan
    R->>D: writeAuditEvent("billing.*", before/after)
  else duplicate
    A-->>S: 200 (no-op)
  end
```

## Level 2 — GDPR erasure with grace period

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant A as API
  participant Q as BullMQ
  participant E as Erasure worker
  participant D as Mongo
  participant M as Email
  U->>A: POST /me/erase
  A->>D: set user.erasureScheduledAt = now + 7d
  A->>Q: enqueue privacy.erasure_pending
  Q->>M: send "we will erase on X" email
  Note over Q,E: cron daily sweep
  E->>D: find users where erasureScheduledAt <= now
  loop each user
    E->>D: redact PII fields (Zod pii-tagged)
    E->>D: rewrite audit before/after (redact), append erasure-receipt row
    E->>M: send "erasure complete"
  end
```

## Data stores

| Store | Collections / keys | Purpose | Retention |
|-------|--------------------|---------|-----------|
| Mongo `users` | users | Accounts | Until erasure |
| Mongo `workspaces` | tenants | Billing + plan | Until deleted |
| Mongo `memberships` | user↔workspace | Roles | Until removed |
| Mongo `audit_events` | hash-chained log | Evidence | 7 years default |
| Mongo `stripe_events` | dedup cache | Webhook idempotency | 30 days |
| Redis (BullMQ) | queues | Async jobs | Per-queue TTL |
| S3 `exports/` | per-request zip | GDPR Art. 20 | 7 days signed URL |

## Trust boundaries

```mermaid
flowchart LR
  subgraph Internet
    BROWSER
    STRIPE
  end
  subgraph Edge["Edge / CDN"]
    VERCEL[Next.js on Vercel]
  end
  subgraph VPC["Private VPC"]
    APIBOX[API box]
    WORKBOX[Worker box]
    MONGO[(Mongo)]
    REDIS[(Redis)]
  end
  subgraph Object["S3 / R2"]
    S3[(Object store)]
  end
  BROWSER -- HTTPS --> VERCEL
  VERCEL -- signed fetch --> APIBOX
  STRIPE -- signed webhook --> APIBOX
  APIBOX --> MONGO
  APIBOX --> REDIS
  REDIS --> WORKBOX
  WORKBOX --> MONGO
  WORKBOX --> S3
  VERCEL -- signed URLs --> S3
```

## Invariants & contracts

- Every mutating HTTP handler writes **exactly one** audit row per logical action.
- Audit rows are append-only; the hash chain is verified nightly.
- Stripe events are processed at-least-once; handler is idempotent via dedup table.
- PII schema tags are the source of truth for both export (Art. 20) and erasure (Art. 17).
- Every `/api/*` route has a Zod schema; invalid payloads return 400 before any DB call.
