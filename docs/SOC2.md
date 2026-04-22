# SOC 2 Control Mapping — mern-devsuite

> **Scope.** This template provides the *code primitives* that make
> SOC 2 Type II achievable. It is **not** itself "SOC 2 certified" —
> auditors certify organizations, not templates. Use this document as
> the starting point for your control narrative.

## Trust Services Criteria — what's in the box

The Trust Services Criteria (TSC 2017, revised 2022) are the AICPA's
five categories. Every production deployment must cover **Security**
(the "common criteria" / CC series). The other four are in-scope only
if you make relevant claims to customers.

### CC1 — Control Environment

| Control | Where it lives | Evidence |
|---|---|---|
| CC1.1 — integrity / ethics | Out of scope for code | HR policy, Code of Conduct |
| CC1.2 — board oversight | Out of scope | Board minutes |
| CC1.3 — structures / reporting lines | Out of scope | Org chart |
| CC1.4 — competence | Out of scope | Training records |
| CC1.5 — accountability | Out of scope | Role descriptions |

### CC2 — Communication & Information

| Control | Where | Evidence |
|---|---|---|
| CC2.1 — objectives | `docs/PRD.md` | Product brief |
| CC2.2 — internal comms | Out of scope | Slack, wiki |
| CC2.3 — external comms | `docs/PRIVACY_POLICY.md` | Published privacy policy |

### CC3 — Risk Assessment

Risk register lives outside the repo. The code *enables* controls that
the register would mandate.

### CC4 — Monitoring

| Control | Where | Evidence |
|---|---|---|
| CC4.1 — monitor controls | `services/audit.ts` + `verifyChain()` | Daily chain-verify cron |
| CC4.2 — remediate deficiencies | `docs/INCIDENT_RESPONSE.md` | Post-mortems |

### CC5 — Control Activities

| Control | Where | Evidence |
|---|---|---|
| CC5.1 — select control activities | This doc | Control matrix |
| CC5.2 — technology controls | Source tree | Code review, this doc |
| CC5.3 — policies & procedures | `docs/` | Published docs |

### CC6 — Logical & Physical Access

This is the largest code-relevant family.

| Control | Where | Implementation notes |
|---|---|---|
| CC6.1 — logical access | `middleware/auth.ts`, `middleware/workspace.ts` | JWT (HS256) + RBAC (owner / admin / member / guest). Revocation is immediate — the middleware re-reads the user row on every call, never trusts cached token claims past identity. |
| CC6.2 — user provisioning | `routes/auth.ts` | Registration creates User + default Workspace + owner Membership atomically. |
| CC6.3 — role changes | `MembershipModel` | Role updates take effect on the next request (no token refresh delay). |
| CC6.6 — system hardening | `app.ts` | `helmet`, `cors` whitelist, `express-rate-limit` (120/min default, 10/min on `/api/auth`). |
| CC6.7 — data in transit | Deploy-time | Enforce TLS at the edge (Vercel / Render / nginx). |
| CC6.8 — malicious software | Out of scope | EDR on build hosts |

### CC7 — System Operations

| Control | Where | Implementation notes |
|---|---|---|
| CC7.1 — monitor system capacity | Out of scope | APM — Datadog, Grafana |
| **CC7.2 — detect anomalies** | `services/audit.ts` | **Tamper-evident hash chain.** Every privileged action logs an event with `hash = sha256(prevHash \|\| canonical(payload))`. `verifyChain()` walks the log and returns the first break. Run it daily from cron — a broken chain is a P1 page. |
| CC7.3 — security incident evaluation | `docs/INCIDENT_RESPONSE.md` | Incident runbook |
| CC7.4 — respond / recover | Deploy-time | Backup restore drill every 6 months |

### CC8 — Change Management

Covered by your CI/CD pipeline, not this repo. Flag for auditors:
protected `main`, mandatory review, CI-gated merges.

### CC9 — Risk Mitigation

| Control | Where | Notes |
|---|---|---|
| CC9.1 — risk mitigation | Out of scope | Vendor DPAs, insurance |
| CC9.2 — vendor management | `docs/DPA.md` | Subprocessor list + contract links |

## Additional Criteria — if you claim them

| Category | Claim it when | Where the primitives live |
|---|---|---|
| Availability | You publish an SLA | Deploy-time (multi-AZ, health checks) |
| Processing Integrity | You make correctness claims | Zod schemas + integration tests |
| Confidentiality | You handle classified data | Encryption at rest (Atlas KMS) + RBAC |
| Privacy | You process PII per AICPA privacy criteria | `docs/PRIVACY_POLICY.md` + `routes/gdpr.ts` |

## The audit chain in one diagram

```
GENESIS ──► evt₀ ──► evt₁ ──► evt₂ ──► ... ──► evtₙ
            │prevHash=GEN  │prevHash=H₀   │prevHash=H₁
            │hash=H₀        │hash=H₁       │hash=H₂
            │payload={      │              │
            │  seq, actor,  │              │
            │  action, ...} │              │

H_i = sha256(prevHash_i || canonical(payload_i))
```

Every event's `hash` is embedded in the next event's `prevHash`. A
single tampered row invalidates every downstream hash — which is why
`verifyChain()` can isolate the incident to a specific `seq`.

## Recommended evidence bundle

For a SOC 2 Type II audit, collect monthly:

1. Output of `verifyChain()` saved as `audit/<YYYY-MM>.json` (should be `{ok: true}`).
2. Raw Mongo dump of the `auditevents` collection (read-only backup proof).
3. CI log showing `pnpm test` green on the main branch.
4. Access review — list of users with each role, owner-reviewed.
5. Pager incident log (from PagerDuty / Opsgenie).

## What you still owe your auditor

Code primitives only get you partway. You still need:

- Written **Information Security Policy** (ISP), reviewed annually.
- **Access review cadence** (quarterly is standard).
- **Vendor risk assessments** for every subprocessor (Atlas, Vercel, …).
- **Backup restore drill** with signed evidence every 6 months.
- **Pen test** by an independent firm before Type II window starts.
- **Incident response runbook** with real on-call coverage (see `INCIDENT_RESPONSE.md`).

No amount of code compensates for a missing policy binder.
