# V1 delivery roadmap

Status: Sequence and exit gates are committed; durations are planning estimates for a small focused team.

## Phase 0 — Validation and design (2–3 weeks)

Deliver product interviews for the two target segments, approved accounting/GST test vectors, wireframes, data migration samples, logical schema, OpenAPI skeleton, threat model, and pilot agreements.

Exit: MVP decisions are signed off; no unresolved issue can change invoice, stock, tenant, or subscription architecture.

## Phase 1 — Platform foundation (3 weeks)

Build authentication, organizations, companies, branches, users, roles, audit log, plan entitlements, core subscription lifecycle, deployment environments, backups, and observability.

Exit: automated tenant/branch authorization tests pass and a backup restore works.

## Phase 2 — Catalogue and inventory (3 weeks)

Build products, variants, barcodes, units, tax master, warehouses, opening stock, movement ledger, balances, imports, counts, and transfers.

Exit: concurrency/idempotency tests pass and stock balance rebuild matches the ledger.

## Phase 3 — POS, sales, and receivables (4 weeks)

Build POS sessions, fast cart, tax calculation, invoices, split/credit payments, PDF/thermal print, returns, cancellations, customer statements, and cash closing.

Exit: accountant-approved calculation fixtures pass; duplicate-post and invoice-integrity tests pass; median pilot-device checkout meets the target.

## Phase 4 — Purchases, expenses, and payables (2–3 weeks)

Build supplier workflow, purchase bills, payments, purchase returns, expenses, attachments, and payables.

Exit: purchase tax, stock, payable, return, and cancellation fixtures pass.

## Phase 5 — Reports and hardening (2–3 weeks)

Build essential reports/exports, monitoring, rate limits, file scanning, restore automation, performance testing, accessibility pass, and support tools. Implement the separate AI subscription ledger and tightly bounded draft/query capabilities behind feature flags.

Exit: security release gates pass; core works with AI disabled; AI evaluation meets the minimum pilot thresholds.

## Phase 6 — Controlled pilot (6 weeks)

Run discovery/data preparation, shadow mode, one-register live use, stabilization, and optional AI trial with two or three businesses.

Exit: pilot decision is `graduate`, `extend`, or `stop` using [PILOT-PLAN.md](PILOT-PLAN.md).

## Post-V1 candidates

- E-invoice/e-way bill and GST reconciliation after legal/integration validation
- Batch/expiry inventory and warranty/service tracking
- Public API, webhooks, custom roles, and deeper integrations
- Full offline posting only after an invoice-number/conflict design is proven
- Native mobile apps
- Additional AI capabilities only when accuracy, privacy, support cost, and unit economics are acceptable

## Delivery policy

- Do not start a later phase while a critical data-integrity or tenant-isolation exit gate is failing.
- Use feature flags for incomplete or pilot-only capabilities.
- Each phase includes migrations, tests, observability, user documentation, and rollback planning—not only UI completion.
- Scope changes must state customer evidence, schedule impact, data-model impact, and what existing item is removed or deferred.
