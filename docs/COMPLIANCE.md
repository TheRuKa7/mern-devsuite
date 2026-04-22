# Compliance Layer — mern-devsuite

Mapping of built-in primitives to common compliance frameworks.

## What's included

| Feature | SOC-2 | GDPR | HIPAA | Notes |
|---------|-------|------|-------|-------|
| Audit log middleware | CC6.1, CC7.2 | — | §164.312(b) | Capped collection, indexed by actor + timestamp |
| Data export endpoint | — | Art. 20 | — | Returns a ZIP of user's PII |
| Data deletion endpoint | — | Art. 17 | — | Soft-delete with 30d grace, then purge |
| Session rotation | CC6.1 | — | §164.312(a)(2)(iii) | Auth.js built-in |
| TLS everywhere | CC6.7 | — | §164.312(e)(1) | Enforced by hosting provider |
| Password hashing | CC6.1 | — | §164.312(d) | bcrypt via Auth.js |
| Role-based access control | CC6.1 | — | §164.308(a)(3) | `requireRole` middleware |
| Rate limiting | CC6.6 | — | — | express-rate-limit + Redis |

## What's NOT included (deployment-time)

- Encryption at rest (use Mongo Atlas encrypted cluster)
- Backup + point-in-time recovery (Mongo Atlas or mongodump cron)
- Access logs for infrastructure (cloud provider responsibility)
- Penetration testing (your responsibility)
- Vendor risk management
- Incident response runbook
- Employee access reviews

## Disclaimer

This template gives you the **code primitives**. Certification (SOC-2 Type II, ISO 27001, HIPAA compliance) requires:
- Organizational controls (policies, training, access reviews)
- Third-party audit
- Ongoing operations (not just a checkbox)

No template is "SOC-2 certified"; auditors certify *organizations using* templates.
