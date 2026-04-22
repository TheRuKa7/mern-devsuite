# Incident Response Runbook

> **Severity, quickly.** If you're on-call and something's burning,
> jump to §3 — §1 and §2 are for the quarterly tabletop.

## 1. Scope

This runbook covers **security incidents** — unauthorized access, data
exfiltration, tampering, malicious code, DDoS. Operational incidents
(latency, 5xx spikes) go in a separate runbook; this one assumes a bad
actor is involved.

## 2. Roles

| Role | Who | Responsibility |
|---|---|---|
| Incident Commander (IC) | On-call engineer | Drives the response end-to-end |
| Scribe | Second engineer | Writes timeline in the incident channel |
| Comms lead | Founder / VP Eng | Customer / regulator / PR comms |
| Security lead | Designated (rotates) | Owns forensics + root cause |
| Legal lead | External counsel | Required for GDPR 72-hour clock |

On a team of two, the same person wears Scribe + Security. Keep IC
separate — the IC's job is to decide, not to type.

## 3. The 72-hour clock (GDPR Art. 33)

If **personal data** was accessed or exfiltrated, the regulator-notification
clock starts **the moment you become aware**, not the moment you finish
forensics. Track it from minute zero.

Template text for the supervisory authority (edit before sending):

> **Controller:** [Legal entity, address, DPO contact]
> **Nature of breach:** [categories + approximate number of data
>   subjects + categories + approximate number of records affected]
> **Likely consequences:** [e.g., credential re-use risk, identity
>   fraud risk, reputational harm]
> **Measures taken or proposed:** [e.g., forced password reset,
>   invalidated all sessions, patched CVE-…]
> **Contact:** [DPO email + phone]

## 4. Response phases

### 4.1 Detect

Sources of a possible incident:

- **Audit chain verification fails.** `verifyChain()` returns
  `{ok: false, brokenAt: N}`. Treat as P1 until proven benign — a
  broken chain means someone mutated the audit table directly.
- **Rate limiter spike on `/api/auth/*`.** Brute-force or credential
  stuffing.
- **External report.** Security researcher email, customer ticket,
  bug bounty submission.
- **WAF / IDS alert.** Whatever your edge provider runs.
- **Unusual `gdpr.delete.hard` events.** A legitimate signal; a flood
  is suspicious.

### 4.2 Triage

Within 30 minutes of detection, decide severity:

| Sev | Criteria | Response |
|---|---|---|
| SEV-1 | Confirmed data exfiltration / admin account compromise | All-hands, GDPR clock starts |
| SEV-2 | Likely incident not yet confirmed | IC assigned, forensics begins |
| SEV-3 | Anomaly that needs explanation but no evidence of compromise | Investigated next business day |

### 4.3 Contain

First goal is to stop the bleeding. Common levers:

- **Revoke sessions.** Rotate `AUTH_SECRET`. Every JWT becomes invalid
  on the next request; all users get logged out. Disruptive — do it
  for SEV-1.
- **Block a user.** `UserModel.updateOne({_id}, {deletedAt: new Date()})`.
  `requireAuth` treats `deletedAt` as dead and rejects.
- **Disable a route.** Comment out the router mount in `app.ts` and
  deploy.
- **Lock the database.** Mongo Atlas: toggle IP allowlist to the
  incident responder's IP only.

### 4.4 Eradicate

- Patch the vulnerability (code change + deploy).
- Rotate every credential the attacker could have touched:
  `AUTH_SECRET`, DB credentials, API keys for third-party services.
- Scan for persistence: any new users? Any `role: "admin"` changes?
  Any new `Workspace` with a stranger as owner?

### 4.5 Recover

- Restore clean data from the last known-good backup (see backup
  drill evidence).
- Force password reset for impacted users.
- Re-enable routes.

### 4.6 Post-incident

Within 5 business days of closure:

1. Write a **blameless post-mortem** — what happened, timeline,
   contributing factors, remediation, prevention.
2. File **remediation tickets** with owners and due dates.
3. Update this runbook with any gap discovered during response.
4. Share the post-mortem with leadership; share a redacted version
   with affected customers on request.

## 5. Customer notification

GDPR Art. 34 requires notification to data subjects when the breach is
"likely to result in a high risk" to their rights and freedoms. Draft
in plain language:

> What happened, when, what data was affected, what we've done, what
> you should do (change password, watch for phishing), how to contact
> us.

Do **not** send until legal has reviewed. Save the outgoing copy in
the incident record.

## 6. External reporting

| Authority | Threshold | Deadline |
|---|---|---|
| EU supervisory authority (GDPR) | Any personal data breach | 72 hours |
| US state AG | Varies by state (see Baker Hostetler map) | 30-60 days typical |
| California AG (CCPA) | >500 CA residents | "Most expedient time possible" |
| SEC (if public) | Material cybersecurity incident | 4 business days |
| Cyber insurance | Per policy | Usually 72 hours |

If in doubt: notify. Under-notification has bigger downside than
over-notification.

## 7. Forensic evidence to preserve

- Mongo audit collection snapshot (hash-chained — treat as canonical).
- Application logs (`pino` output) for the affected window.
- Edge access logs (Vercel / CloudFront / nginx).
- Memory dumps / process snapshots if you caught a compromised host.
- Chat transcripts from the incident channel.

Store in a restricted-access S3 bucket (or equivalent) with object
lock + MFA-delete for 1 year minimum.

## 8. Tabletop cadence

Run a 60-minute tabletop quarterly. Rotate the IC role. Pick a
scenario: *admin account credentials leaked on GitHub*,
*customer reports finding another customer's data*, *Mongo instance
has an open port*. Walk the runbook, note gaps, update this doc.
