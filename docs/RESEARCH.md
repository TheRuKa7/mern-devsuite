# /ultraresearch — mern-devsuite

## 1. MERN in 2026

| Layer | 2022 state | 2026 state |
|-------|-----------|-----------|
| MongoDB | 5.x, CRUD | **8.x**: native vector search, time-series, change streams mature |
| Express | 4.x, callback-heavy | **5.x**: async/await native, better error propagation |
| React | 18, hooks | **19**: RSC stable, Server Actions, `use()` |
| Node | 18 | **25**: native TypeScript, native test runner, fetch |

## 2. Competitive scan

| Template | DB | Auth | Payments | Compliance | Tracing |
|----------|----|----|----------|------------|---------|
| create-t3-app | Open (Prisma) | NextAuth | ❌ | ❌ | ❌ |
| Redwood | Prisma/SQL | dbAuth | Stripe | ❌ | ❌ |
| Blitz | Prisma/SQL | built-in | ❌ | ❌ | ❌ |
| SaaS UI | open | open | Stripe | ❌ | ❌ |
| **mern-devsuite** | Mongo 8 | Auth.js | Stripe | ✅ | ✅ |

## 3. Auth.js v5 vs alternatives

- **Auth.js v5** (next-auth rewrite): Edge-compatible, OAuth + email + credentials, pluggable adapters — **pick**
- **Clerk**: Hosted, excellent UX, but locks into vendor + pricing
- **Lucia**: Simple, library-style, but less ecosystem
- **Better Auth**: Rising star, worth watching for v2

## 4. Payments: Stripe vs alternatives

- **Stripe**: Mature, best docs, subscriptions + metered billing — **pick**
- **Paddle**: Merchant-of-record (handles VAT) — good for EU-heavy SaaS
- **Lemon Squeezy**: MoR, simpler; acquired by Stripe
- **Recurly / Chargebee**: Enterprise, overkill for template

## 5. Observability stack

- **OpenTelemetry** (vendor-neutral spec)
- Export to: Honeycomb, Datadog, Grafana, SigNoz, Uptrace, or self-hosted Tempo + Loki
- Error tracking: **Sentry** (standard)
- Real-user monitoring: **Vercel Analytics** or **PostHog** (open)

## 6. Compliance primitives

What's needed to be SOC-2 / GDPR-ready:
- **Audit log**: immutable, queryable, time-stamped record of mutations
- **Data export**: user can download all their data (GDPR Art. 20)
- **Data deletion**: user can delete their account + data (GDPR Art. 17)
- **Access logs**: who accessed what, when
- **Encryption at rest + in transit**: Mongo Atlas encryption + TLS
- **Backup + DR**: point-in-time restore
- **Access controls**: RBAC, principle of least privilege

Most templates skip these. We include middleware + endpoints for the first four; the rest are deployment concerns documented in `docs/COMPLIANCE.md`.

## 7. Testing pyramid

- **Vitest**: unit, fast, ESM-native
- **supertest**: Express integration tests
- **Playwright**: E2E with real browsers; cross-browser matrix
- **MSW**: API mocking for frontend tests
- Target coverage: 80% unit, critical paths E2E
