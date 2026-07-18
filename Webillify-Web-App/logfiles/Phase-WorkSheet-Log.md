# Webillify phase worksheet

Baseline created: **2026-07-17 16:35:25 IST**  
Source of truth: Current Webillify repository and parent product specifications  
Imported non-Webillify plan: [archive/Imported-Ageera-Phase-WorkSheet-Log.md](archive/Imported-Ageera-Phase-WorkSheet-Log.md)

## Phase overview

| Phase | Name                                | Status      | Progress basis                                             |
| ----- | ----------------------------------- | ----------- | ---------------------------------------------------------- |
| 0     | Product definition and architecture | COMPLETE    | Product specification documents populated                  |
| 1     | Web frontend foundation             | COMPLETE    | Angular UI slice, PWA, build and baseline test             |
| 2     | Frontend application foundation     | COMPLETE    | Typed data layer, auth state, guards, shared UX, tests     |
| 3     | Backend identity and tenancy        | IN PROGRESS | NestJS, PostgreSQL, organization/branch/RBAC/subscriptions |
| 4     | Catalogue, purchases and inventory  | PLANNED     | Product master, purchase posting and stock ledger          |
| 5     | POS, sales, returns and receivables | PLANNED     | Server-backed transactional billing workflows              |
| 6     | Reports, GST summaries and closing  | PLANNED     | Reconciled operational reporting                           |
| 7     | Separate Webillify AI subscription  | PLANNED     | Bounded AI drafts, queries, credits and privacy controls   |
| 8     | Hardening and pilot                 | PLANNED     | Security, performance, backup restore, E2E and pilot       |

## Phase 0 — Product definition and architecture

Status: **COMPLETE**

- [x] Product vision and initial customer segments
- [x] V1 scope and explicit exclusions
- [x] Roles and permission boundaries
- [x] Business flows
- [x] Accounting, inventory and GST rules
- [x] Logical database design and API outline
- [x] Security model
- [x] Core subscriptions and separate Webillify AI subscription
- [x] Pricing assumptions, roadmap and pilot plan

Gate: Specifications exist, but accounting, GST and launch pricing still require professional/pilot validation.

## Phase 1 — Web frontend foundation

Status: **COMPLETE**  
Completed: **2026-07-17 16:24:18 IST**

- [x] Angular 22 standalone strict project
- [x] Lazy route structure
- [x] Responsive sidebar/topbar shell
- [x] Demo sign-in page
- [x] Dashboard UI
- [x] Interactive POS UI
- [x] Product catalogue UI
- [x] Placeholder routes for customers, purchases, reports and settings
- [x] Web manifest, icon and Angular service worker
- [x] Production build, formatting and baseline test

Gate evidence: `npm run build` and `npm test -- --watch=false` passed again at 2026-07-17 16:35 IST.

## Phase 2 — Frontend application foundation

Status: **COMPLETE — 2026-07-17 17:22:35 IST**  
Priority: **P0**

- [x] `WBL-FE-007` Typed models, repository interfaces and mock/API data modes
- [x] `WBL-FE-008` Authentication state, guards and permission directives
- [x] `WBL-FE-009` Shared request/loading/error/toast/confirmation layer
- [x] `WBL-QA-002` Focused Dashboard/POS/Products feature unit tests
- [x] `WBL-QA-003` Accessibility and responsive browser audit
- [x] `WBL-SETUP-002` Environment configuration and API base URL contract

Exit gate: Existing pages no longer import mock data directly; protected routes and test primitives exist; build and feature tests pass.

## Phase 3 — Backend identity and tenancy

Status: **IN PROGRESS — WBL-BE-001 through BE-005 and SEC-001 complete; frontend API integration remains**
Depends on: Phase 2 boundary contracts

- [x] NestJS modular-monolith scaffold
- [x] PostgreSQL migrations and seed strategy
- [x] Login, refresh rotation, logout and login history foundation (password reset remains queued)
- [x] Organizations, companies, branches, memberships and branch access
- [x] Roles, permissions and sensitive-action checks (audit persistence continues with business APIs)
- [x] Versioned plan entitlements and independent AI subscription lifecycle
- [x] Automated cross-tenant and cross-branch authorization matrix

Exit gate: Authenticated frontend works with real APIs; isolation tests are release blockers.

## Phase 4 — Catalogue, purchases and inventory

Status: **IN PROGRESS — connected purchase lifecycle complete; remaining inventory operations continue**

- [x] Product/category/unit/tax/barcode core APIs (CSV import remains queued)
- [x] Suppliers, purchase bills, payments, cancellation and linked returns
- [x] Immutable stock movement ledger and rebuildable balances
- [ ] Opening stock, counts, adjustments and branch transfers
- [x] Weighted-average valuation and concurrency/idempotency tests
- [x] Products and core purchase workflows connected to APIs

Exit gate: Stock balances reconcile to movements and approved purchase/return fixtures.

## Phase 5 — POS, sales, returns and receivables

Status: **IN PROGRESS — BE-008B atomic posting API complete; browser connection and compensation next**

- [x] POS sessions and cash movement persistence/constraints
- [x] Server-calculated atomic invoice posting
- [x] Cash/card/UPI/bank split-payment persistence/constraints and posting API
- [ ] Customer balances, receipts and allocations
- [ ] Sales return, credit note and cancellation/reversal
- [ ] PDF/thermal invoice; financial-year series persistence complete
- [ ] Offline recoverable cart only; final posting remains online in V1

Exit gate: GST/accounting fixtures, invoice immutability, retry idempotency and stock concurrency tests pass.

## Phase 6 — Reports, GST summaries and closing

Status: **PLANNED**

- [ ] Sales, tax and payment-method reports
- [ ] Stock, low-stock and valuation reports
- [ ] Receivables and payables
- [ ] POS closing and variance approval
- [ ] Role/branch-scoped asynchronous CSV export

Exit gate: Report totals reconcile to transaction ledgers across approved fixtures.

## Phase 7 — Separate Webillify AI subscription

Status: **PLANNED**  
Rule: AI is optional and never blocks core billing.

- [ ] Independent AI entitlement and credit ledger
- [ ] Purchase-document extraction into human-reviewed draft
- [ ] Permission-scoped natural-language business queries
- [ ] Report summary, anomaly suggestion and reminder draft
- [ ] Provider privacy/retention controls and minimum-data retrieval
- [ ] Prompt-injection and cross-tenant regression suite
- [ ] Provider outage fallback to manual workflows

Exit gate: No AI endpoint posts financial/stock changes; accuracy, privacy and unit-economics pilot thresholds pass.

## Phase 8 — Hardening and pilot

Status: **PLANNED**

- [ ] CI/CD, environment separation and secrets management
- [ ] End-to-end critical-flow tests
- [ ] Performance and accessibility testing
- [ ] File scanning, rate limits and security review
- [ ] Monitoring, error reporting and operational runbooks
- [ ] Encrypted backup and successful restore rehearsal
- [ ] Controlled two-to-three-business pilot

Exit gate: Pilot decision recorded as `graduate`, `extend` or `stop` with measured evidence.
