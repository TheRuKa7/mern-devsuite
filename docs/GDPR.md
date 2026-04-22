# GDPR — Data Subject Rights in mern-devsuite

## Which rights are implemented in code

| Right | Article | Endpoint | Implementation |
|---|---|---|---|
| **Right of access** | Art. 15 | `GET /api/gdpr/export` | Streams a JSON bundle with the user row, memberships, owned workspaces, created projects, and the user's audit events. Served with `Content-Disposition: attachment` so browsers download it. |
| **Right to rectification** | Art. 16 | `PATCH /api/me` (not shipped — wire this to your profile page) | One-line route once you have a profile form. |
| **Right to erasure ("right to be forgotten")** | Art. 17 | `DELETE /api/gdpr/delete` | Soft-deletes by default with a 30-day grace window; a cron job (not shipped) hard-deletes after. Set `GDPR_HARD_DELETE=true` to skip the window. |
| **Right to restrict processing** | Art. 18 | `deletedAt` field | When set, `requireAuth` treats the account as deleted and rejects with 403. |
| **Right to data portability** | Art. 20 | `GET /api/gdpr/export` | Same endpoint as Art. 15; the JSON format is trivially machine-readable. |
| **Right to object** | Art. 21 | Out of scope (marketing) | If you add marketing emails, add an opt-out column and filter on it. |
| **Rights re: automated decision-making** | Art. 22 | N/A | No automated profiling in the base template. |

## Lifecycle of a deletion request

```
user clicks "Delete my account"
    │
    ▼
DELETE /api/gdpr/delete
    │
    ├─► appendAudit({action:"gdpr.delete.soft", ...})     // audit BEFORE mutation
    │
    ├─► UserModel.updateOne({_id}, {
    │     deletedAt: now,
    │     email: `deleted+<id>@tombstone.invalid`,
    │     name: "[deleted]",
    │     passwordHash: "__deleted__"
    │   })
    │
    └─► 202 Accepted  {status: "accepted", mode: "soft-30d"}

  — 30 days elapse —

scheduled job (docs/RUNBOOK.md ► Daily GDPR sweep)
    │
    ├─► deleteMany({deletedAt: < now - 30d})
    ├─► deleteMany memberships / projects created by those users
    └─► UPDATE workspaces to null ownerId (keep tenant for other members)
```

The pre-mutation audit matters: even a failed deletion attempt leaves a
record, and that record is immutable (hash chain).

## Why soft delete by default

- **User-protective.** Most deletion requests are regret-risk — the
  30-day window exists so a user can recover from an angry click.
- **Operational safety.** A fat-finger in a bulk deletion job is much
  less catastrophic when the rows are still there to restore.
- **Audit trail preservation.** Immediate hard-delete would leave the
  audit log pointing at a `_id` that no longer resolves; soft delete
  keeps those references meaningful for the regulator.

You can flip `env.GDPR_HARD_DELETE=true` for data minimization
requirements that forbid a grace window (e.g., HIPAA in combination
with a patient-portal claim) — but think carefully about the tradeoff
before doing so in production.

## What the export contains

```jsonc
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-22T15:30:00.000Z",
  "subject": { "id": "…", "email": "…" },
  "user":            { /* UserModel row */ },
  "memberships":     [ /* MembershipModel rows */ ],
  "workspacesOwned": [ /* WorkspaceModel rows */ ],
  "projectsCreated": [ /* ProjectModel rows */ ],
  "auditEvents":     [ /* AuditModel rows authored by subject */ ]
}
```

Notably **absent:** password hashes (the `UserModel.toJSON` transform
strips them) and events authored by *other* users about the subject.
The latter is intentional — returning a third-party admin's action on
the subject would leak the admin's identity.

## Subprocessors — see `docs/DPA.md`

Every GDPR controller must publish a subprocessor list. The template's
default list in `DPA.md` is deliberately short (you'll add your cloud
vendors). Update it before going live.

## Data Protection Impact Assessment (DPIA)

Not every product needs a DPIA — it's required when processing is
"likely to result in a high risk" to data subjects. Trigger examples:

- Large-scale monitoring of public areas
- Systematic profiling with legal effects
- Large-scale processing of special-category data (health, biometrics)

The mern-devsuite base template does none of these. If your product
does, DPIA requirements are out of scope for this doc — read ICO
guidance or talk to a privacy lawyer.

## Retention

| Data | Retention |
|---|---|
| Active user rows | Until user deletes |
| Tombstoned user rows | 30 days (soft-delete window), then purged |
| Audit log | Indefinite (required for CC7.2; tombstone actor IDs if you must purge) |
| Application logs (pino → stdout) | 30 days at the log aggregator |
| Access logs at the edge | 90 days |

If a customer demands a shorter audit retention, write them a DPA
addendum that overrides this default.

## Breach notification

Art. 33 requires controller → supervisory authority within **72 hours**
of becoming aware of a personal data breach. See
`docs/INCIDENT_RESPONSE.md` for the full runbook.
