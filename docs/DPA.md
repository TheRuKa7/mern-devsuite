# Data Processing Addendum — Template

> **Starter template.** Have your lawyer diff this against the current
> EDPB / DPC guidance before signing. Nothing here is legal advice.

This Data Processing Addendum ("**DPA**") forms part of the Agreement
between `[Controller Name]` ("**Customer**") and `[Processor Name]`
("**Provider**") and reflects Articles 28 and 32 of the GDPR.

## 1. Definitions

- **"GDPR"** means Regulation (EU) 2016/679 and, in the UK, the UK
  GDPR as incorporated by the Data Protection Act 2018.
- **"Personal Data"** has the meaning given in GDPR Art. 4(1).
- **"Processing"** has the meaning given in GDPR Art. 4(2).
- **"Subprocessor"** means any third party engaged by Provider to
  process Personal Data on Customer's behalf.

## 2. Scope & roles

Customer is the **controller** and Provider the **processor** with
respect to Personal Data processed under the Agreement.

### 2.1 Subject matter & duration

Provider processes Personal Data only for the duration of the
Agreement and only as strictly necessary to provide the service.

### 2.2 Nature & purpose

| Processing activity | Purpose |
|---|---|
| Hosting account data | Authenticate users and scope data access |
| Storing workspace + project data | Provide the core product experience |
| Audit log | Tamper-evident security monitoring (SOC 2 CC7.2) |
| Billing | Charge for paid plans, issue invoices |
| Support | Respond to customer tickets |

### 2.3 Types of Personal Data

Name, email, password hash, IP address, user-agent, and any content
Customer chooses to upload into workspaces or projects.

### 2.4 Categories of data subjects

Customer's employees and authorized users.

## 3. Processor obligations

Provider shall:

1. Process Personal Data only on documented instructions from
   Customer (the Agreement + this DPA are the documented instructions).
2. Ensure personnel are bound by confidentiality.
3. Implement the security measures in Annex II.
4. Assist Customer with data-subject requests, DPIAs (Art. 35), and
   breach notifications (Art. 33-34).
5. Delete or return Personal Data at the end of the Agreement, at
   Customer's choice.
6. Make available information necessary to demonstrate compliance
   with Art. 28 and allow audits (see §7).

## 4. Subprocessors

Provider may engage subprocessors listed in **Annex III** ("**Approved
Subprocessors**"). Provider shall:

1. Impose data protection terms no less protective than this DPA on
   each subprocessor.
2. Notify Customer at least **30 days** before adding or replacing a
   subprocessor. Customer may object on reasonable grounds; Provider
   will work in good faith to resolve.

## 5. Data subject rights

Provider shall, to the extent technically feasible, assist Customer
in fulfilling requests under GDPR Chapter III (Arts. 15-22). The
product's built-in `/api/gdpr/export` and `/api/gdpr/delete` endpoints
satisfy Arts. 15, 17, 20 directly.

## 6. Security incident notification

Provider notifies Customer **without undue delay and in any event
within 48 hours** of becoming aware of a Personal Data Breach. The
notification includes (to the extent known):

- Nature of the breach (categories + approximate numbers).
- Likely consequences.
- Measures taken or proposed.
- Contact for further information.

Customer remains responsible for notifying supervisory authorities
and data subjects.

## 7. Audit rights

Once per year, and on reasonable notice, Customer may audit
Provider's compliance with this DPA. Provider may satisfy this via a
current SOC 2 Type II report or equivalent independent assessment.

Customer shall bear its own audit costs and comply with Provider's
reasonable security policies while on Provider's premises or systems.

## 8. International transfers

Where Personal Data is transferred outside the EEA / UK / Switzerland
to a country without an adequacy decision, the parties agree the
**Standard Contractual Clauses** (Commission Decision (EU) 2021/914,
Module 2 — Controller to Processor) are incorporated herein. The UK
Addendum to the SCCs applies where UK GDPR governs.

## 9. Return & deletion

On termination of the Agreement, Provider shall delete all Personal
Data within **30 days**, except where retention is required by law
(e.g., tax records). Retention beyond that window is subject to the
same security controls as active Personal Data.

## 10. Order of precedence

In the event of a conflict between this DPA and the Agreement, this
DPA prevails on matters of data protection.

---

## Annex I — Subject matter

As described in §2.2 - §2.4 of this DPA.

## Annex II — Technical & organizational measures (TOMs)

### Access control

- Password hashing with bcrypt (cost factor 12, OWASP ASVS 2.1.7).
- JWT sessions signed HS256; `alg: none` downgrade explicitly
  rejected.
- Role-based access control (owner / admin / member / guest).
- Re-authentication on every privileged request (middleware
  re-reads user row from DB).
- Rate limiting (120/min global, 10/min on auth endpoints).

### Data integrity

- Tamper-evident audit log (sha256 linear hash chain).
- Daily chain verification; broken chain pages on-call.
- Input validation via Zod schemas on every API route.

### Encryption

- TLS 1.2+ for all data in transit (edge-terminated).
- Encryption at rest via managed database provider (Atlas encrypted
  cluster, AWS KMS, or equivalent).
- Password hashes + tokens redacted from structured logs.

### Availability

- Managed database with point-in-time recovery.
- Health-checked deployments behind a load balancer.
- Backups restored and tested every 6 months.

### Organizational

- Annual security awareness training.
- Least-privilege production access.
- Vendor risk reviews before onboarding any new subprocessor.
- Background checks where required by law.

## Annex III — Approved Subprocessors

> Replace this list with your real subprocessors before signing
> anything. Each row should link to the subprocessor's own DPA.

| Name | Purpose | Location | DPA |
|---|---|---|---|
| `[MongoDB Atlas]` | Managed database | `[AWS us-east-1]` | `[link]` |
| `[Vercel]` | Web app hosting | `[global edge]` | `[link]` |
| `[Render / Fly]` | API hosting | `[US / EU]` | `[link]` |
| `[Resend / Postmark]` | Transactional email | `[US / EU]` | `[link]` |
| `[Sentry]` | Error monitoring | `[US / EU]` | `[link]` |
| `[Stripe]` | Payments | `[global]` | `[link]` |
