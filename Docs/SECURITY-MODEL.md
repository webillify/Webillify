# Security model

Status: Minimum production security baseline for V1.

## Assets and trust boundaries

Protected assets include tenant customer/supplier data, invoices, stock, payments, credentials, tax identifiers, attachments, exports, subscription records, AI inputs/outputs, audit logs, and backups.

Trust boundaries exist between browser and API, tenant and tenant, ordinary user and privileged role, platform support and tenant data, API and worker, application and payment/messaging/AI providers, and live systems and backups.

## Primary threats

- Cross-organization or cross-branch access through missing scope checks
- Broken object-level authorization using guessed UUIDs
- Account takeover, token theft, credential stuffing, and session fixation
- Invoice/payment/stock tampering or duplicate posting
- Malicious files, formula injection in CSV, and unsafe PDF generation
- Payment webhook forgery or replay
- AI prompt injection, cross-tenant retrieval, sensitive-data leakage, or unsafe autonomous action
- Privileged support misuse and untraceable data correction
- Backup theft, failed restore, or destructive operator error

## Identity and sessions

- Passwords use a current memory-hard hash such as Argon2id with reviewed parameters.
- Login and recovery endpoints are rate-limited without revealing account existence.
- Access tokens are short-lived; refresh tokens rotate on every use and token-family reuse revokes the family.
- Refresh tokens are stored using secure, HTTP-only, same-site cookies where the deployment permits; server stores only a hash/identifier.
- Password reset tokens are single-use, short-lived, and invalidated after password change.
- Owners can view login history, revoke sessions, and require reauthentication for sensitive actions.
- MFA is required for platform administrators before production and is a high-priority owner feature.

## Tenant and authorization controls

- Authentication never implies organization access; every request resolves an active membership and role.
- Repository/query methods require explicit organization scope and verify company/branch ownership.
- Composite foreign keys and PostgreSQL row-level security are used for high-risk tenant tables where practical as defense in depth.
- Authorization tests attempt access with a valid user from another tenant and another branch for every object endpoint.
- IDs are non-sequential, but UUIDs are not treated as an authorization control.
- Plan entitlements and role permissions are enforced server-side.

## Transaction integrity

- Posting operations use database transactions, idempotency keys, request hashes, and unique constraints.
- Posted invoices, tax snapshots, payments, allocations, and stock movements are immutable; correction uses linked reversal/cancellation.
- Final invoice numbers are server allocated and never reused.
- Sensitive actions require current authorization, reason, and audit event; some require password/MFA reconfirmation.
- Audit records capture actor, tenant, action, target, time, correlation ID, outcome, and minimal before/after summary.

## Application and infrastructure

- HTTPS only with modern TLS, HSTS, secure headers, restrictive CORS, and CSRF protection where cookies authenticate requests.
- Schema validation rejects unknown or oversized input where appropriate; output is contextually encoded.
- Parameterized database access only; no user input in raw SQL, shell, template paths, or object keys.
- Rate limits are applied by IP, identity, tenant, and costly route.
- Secrets live in a managed secret mechanism or protected deployment environment, never source control or logs.
- Containers run as non-root with minimal images and read-only filesystems where practical.
- Dependencies and images are scanned; critical fixes are time-bounded before release.
- Production, staging, and development use separate credentials and data.

## Files, exports, and integrations

- Uploads are size/type limited, content-sniffed, malware-scanned, stored outside the web root, and served using short-lived authorised URLs.
- CSV exports neutralize spreadsheet-formula prefixes and are audited.
- Payment and provider webhooks require signature verification, timestamp/replay checks, and idempotent event IDs.
- Logs redact passwords, tokens, full payment details, and unnecessary personal or document content.

## AI-specific controls

- AI is a separate opt-in subscription and permission.
- Retrieval always applies the same tenant, branch, role, and field-level filters as normal reports.
- Customer documents and retrieved text are treated as untrusted instructions; tool/action permissions are not derived from prompt content.
- V1 AI has no financial-posting or customer-send tool.
- Provider configuration must prohibit training on tenant content where supported and document retention/subprocessor terms.
- Model/provider changes run a redacted regression and cross-tenant isolation suite.
- AI run logs record source references, model/provider, credits, warnings, and user review while minimizing sensitive content.

## Backup, recovery, and availability

- Encrypt backups in transit and at rest with access separate from normal application credentials.
- Proposed V1 objectives: database RPO 15 minutes and RTO 4 hours; validate infrastructure cost before promising them contractually.
- Perform daily automated backups, point-in-time recovery where supported, and a documented monthly restore rehearsal during pilot.
- Keep at least one logically separate/off-site backup and monitor backup age and restore failures.
- Incident response defines containment, evidence preservation, tenant notification decision, recovery, and post-incident review.

## Data lifecycle

Document retention periods for financial records, audit logs, AI source documents, exports, and cancelled accounts. Organization owners can export their data. Deletion after contractual/legal retention is verified and includes derived files and provider-held data where applicable.

## Release gates

- Automated tenant/branch authorization matrix passes
- No open critical/high vulnerability without documented acceptance
- Dependency, secret, and container scans pass
- Backup restore and incident tabletop are completed
- Invoice/idempotency/tamper tests pass
- Privileged/support activity is auditable
- AI prompt-injection and cross-tenant evaluation passes before AI pilot
