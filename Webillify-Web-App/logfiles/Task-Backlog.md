# Webillify task backlog

Last prioritized: **2026-07-17 19:34:26 IST**
Active assignee: **Codex — WBL-FE-016B browser workflow integration**
WIP limit: **One P0 task per engineer**

## Just completed

### WBL-FE-016A — Connected authentication, catalogue and stock browser stage

Status: **COMPLETE — 2026-07-17 19:34:26 IST**

- Switched development runtime from mock to real API mode without removing isolated mock tests.
- Added persisted access-token sessions, refresh-cookie support, tenant headers and live organization/branch context.
- Mapped real product variants and branch stock balances into Products and POS.
- Reworked desktop/mobile browser journeys to validate real API behavior and the explicit pending sales boundary.

Result: production/development builds pass, 19/19 unit tests pass, and 4/4 connected Chrome desktop/mobile journeys pass.

## Just completed

### WBL-BE-007B — Protected purchase posting and supplier payments

Status: **COMPLETE — 2026-07-17 19:22:18 IST**

- Added permission- and tenant-protected supplier, purchase bill and supplier-payment endpoints.
- Recalculated line taxable value and reviewed CGST/SGST or IGST snapshots on the server and rejected client-total mismatches.
- Posted purchase stock movements and weighted-average balances atomically with idempotent concurrent retry handling.
- Recorded immutable supplier payments/allocations and allowed only allocation-reconciled paid/outstanding projections.

Result: clean five-migration replay, zero schema drift, lint/build/audit pass, 3 unit and 52 integration tests. Cancellation and returns are intentionally queued as `WBL-BE-007C` compensating workflows.

## Just completed

### WBL-BE-007A — Purchases/payables database foundation

Status: **COMPLETE — 2026-07-17 19:06:21 IST**

- Added tenant-scoped suppliers, purchase bills/items, supplier payments and allocations.
- Preserved purchase tax/cost snapshots and prohibited duplicate supplier invoice references per company.
- Enforced nonnegative money, positive quantities/payments, tenant ownership and append-only posted records in PostgreSQL.
- Added deterministic draft data and regression tests proving a draft has no stock effect and may be deleted before posting.

Result: migration/seed/schema/drift/lint/build/audit pass with 3 unit and 43 integration tests. `WBL-BE-007B` remains active for protected endpoints and atomic stock/payable effects.

## Just completed

### WBL-FE-007 — Typed data-access and application-state foundation

Completed: **2026-07-17 16:51:48 IST** by Codex.

Acceptance criteria:

- [x] No page imports `src/app/data/mock-data.ts` directly.
- [x] Mock mode preserves current visible behavior.
- [x] API mode fails explicitly; it never silently uses mock data.
- [x] Repository interfaces contain no HTML/UI concerns.
- [x] Production/development builds and 6 tests pass.
- [x] Tracking sheets updated with timestamped evidence.

## Just completed

### WBL-FE-008 — Authentication state, route guards and permissions

| Field              | Detail                                             |
| ------------------ | -------------------------------------------------- |
| Status             | COMPLETE — 2026-07-17 17:04:48 IST                 |
| Priority           | P0                                                 |
| Suggested assignee | Codex (assigned)                                   |
| Estimate           | 1–2 sessions                                       |
| Dependencies       | FE-007; documented roles and sensitive permissions |

Required work:

- Define user/session/role/permission models and an authentication repository contract.
- Implement mock and explicit unavailable API adapters using the existing data-mode selection.
- Add a signal-based authentication store with initialize, sign-in and sign-out behavior.
- Protect application-shell routes and redirect unauthenticated users to sign-in.
- Add a guest-only guard for sign-in and preserve requested redirect URL.
- Add a reusable permission-check primitive for future navigation/actions.
- Test authenticated, unauthenticated, redirect and permission cases.

Acceptance criteria:

- [x] Protected routes cannot activate without authenticated state.
- [x] Sign-in and sign-out use the repository/store rather than direct navigation.
- [x] Role/permission checks are typed and deny by default.
- [x] Mock mode remains usable; API mode reports missing adapter explicitly.
- [x] Build and expanded tests pass.
- [x] Tracking sheets updated.

## Just completed

### WBL-FE-009 + WBL-QA-002 — Shared UX and focused feature tests

Status: **COMPLETE — 2026-07-17 17:11:54 IST**

- Add reusable loading, error, empty, toast and confirmation primitives.
- Apply shared feedback to the current feature pages without coupling it to repositories.
- Add focused Dashboard and POS tests for success, error and cart/checkout behavior.
- Re-run formatting, production/development builds and the full unit suite.

Result: global feedback outlets, shared data-state rendering, POS confirmation/toasts and 19 passing tests across 9 files.

## Just completed

### WBL-QA-003 — Accessibility and responsive audit

Status: **COMPLETE — 2026-07-17 17:22:35 IST**

- Audit keyboard navigation, focus visibility, landmarks, accessible names and live feedback.
- Correct dialog keyboard/focus behavior and reduced-motion handling.
- Record mobile/tablet/desktop layout checks and rerun the complete quality baseline.

Result: WCAG fixes plus 6/6 Chrome desktop/mobile Playwright scenarios with axe scanning.

## Just completed

### WBL-BE-001 — NestJS API foundation

Status: **COMPLETE — 2026-07-17 17:39:17 IST**

- Scaffold a strict NestJS API with `/api/v1`, validated configuration and structured errors.
- Add correlation IDs, secure defaults, health/readiness endpoints and generated OpenAPI.
- Add unit/integration tests and independent build/format commands.

Result: NestJS 11 API with versioning, validated environment, correlation IDs, secure headers/CORS, OpenAPI, error envelope and passing lint/build/3 unit/4 HTTP tests.

## Just completed

### WBL-BE-002 — PostgreSQL tenancy schema and migrations

Status: **COMPLETE — 2026-07-17 17:49:06 IST**

- Introduce Prisma/PostgreSQL configuration and an initial identity/tenancy schema.
- Encode tenant ownership, normalized uniqueness, role/permission and session constraints.
- Add deterministic seed data, database readiness and schema/migration verification.

Result: PostgreSQL 17 + Prisma identity/tenancy/RBAC/core-plan/separate-AI schema, composite ownership constraints, clean deploy/seed rehearsal and 6/6 HTTP/database tests.

## Just completed

### WBL-BE-003 — Identity and rotating sessions

Status: **COMPLETE — CORE — 2026-07-17 17:58:00 IST**

- Implement Argon2id credential verification and short-lived JWT access tokens.
- Store only hashed refresh tokens, rotate on use and revoke the family on reuse.
- Add login, refresh, logout and `/me` endpoints with secure cookie behavior and tests.

Result: Argon2id login, JWT, hashed rotating cookies, reuse-family revocation, logout, `/me` and 11 passing integration tests. Forgot/reset password remains a separately tracked identity extension.

## Just completed

### WBL-BE-004 + WBL-SEC-001 — Tenant/branch RBAC and isolation

Status: **COMPLETE — 2026-07-17 18:07:26 IST**

- Resolve active membership from `X-Organization-Id` without trusting raw resource IDs.
- Add typed permission guards and organization/branch/role/permission endpoints.
- Test authorized, missing-tenant, other-tenant and other-branch access combinations.

Result: explicit organization context, active membership resolution, branch scope, typed permission guards and access endpoints with 15/15 API/database/security E2E tests passing.

## Just completed

### WBL-BE-005 — Core and separately billed AI entitlements

Status: **COMPLETE — 2026-07-17 18:22:53 IST**

- Expose versioned core-plan entitlement checks without coupling them to AI access.
- Implement independent AI subscription lifecycle and atomic credit debit/refund behavior.
- Prove cancellation, exhaustion and tenant isolation through integration tests.

Result: three versioned core offers, independent AI plan/usage lifecycle, server-side permission and tenant enforcement, idempotent atomic consume/refund accounting, bounded serialization retries and 26/26 integration tests.

## Recommended next task

### WBL-BE-006 — Catalogue and immutable inventory ledger

Status: **COMPLETE — 2026-07-17 18:46:55 IST**

- Add tenant-scoped products, variants, categories, units, taxes and barcode identities.
- Record stock changes as immutable movements with rebuildable branch balances.
- Enforce core entitlements, permissions, idempotency and concurrency in the same transaction.

Result: real catalogue/reference/stock APIs, atomic product creation, branch-scoped reads, append-only adjustments, changed-retry detection, negative-stock protection, serialized concurrent issues and reconciled ledger/projection with 38/38 integration tests.

## Recommended after BE-006

### WBL-BE-007 — Purchases and payables

Status: **READY — accounting/GST fixtures remain an external production gate**

## Prioritized queue

| Task ID          | Priority | Task                                         | Status     | Suggested owner    | Depends on      |
| ---------------- | -------- | -------------------------------------------- | ---------- | ------------------ | --------------- |
| `WBL-FE-007`     | P0       | Typed data/state foundation                  | COMPLETE   | Codex              | Phase 1         |
| `WBL-SETUP-002`  | P0       | Environments and API URL contract            | COMPLETE   | Codex              | None            |
| `WBL-FE-008`     | P0       | Auth state, guards and permission primitives | COMPLETE   | Codex              | FE-007          |
| `WBL-QA-002`     | P0       | Dashboard/POS/products unit tests            | COMPLETE   | Codex              | FE-007          |
| `WBL-BE-001`     | P0       | NestJS scaffold and health endpoint          | COMPLETE   | Codex              | API spec        |
| `WBL-BE-002`     | P0       | PostgreSQL tenancy schema/migrations         | COMPLETE   | Codex              | BE-001          |
| `WBL-BE-004`     | P0       | Organization/branch/RBAC APIs                | COMPLETE   | Codex              | BE-002/003      |
| `WBL-SEC-001`    | P0       | Tenant/branch authorization harness          | COMPLETE   | Codex              | BE-002/004      |
| `WBL-BE-005`     | P0       | Core and separate AI entitlements            | COMPLETE   | Codex              | BE-004          |
| `WBL-BE-006`     | P0       | Catalogue and immutable inventory ledger     | COMPLETE   | Codex              | BE-005          |
| `WBL-BE-007A`    | P0       | Purchase/payables database foundation         | COMPLETE   | Codex              | BE-006          |
| `WBL-BE-007B`    | P0       | Protected purchase posting/payment APIs       | COMPLETE    | Codex              | BE-007A         |
| `WBL-BE-007C`    | P0       | Purchase cancellation/return compensation     | READY       | Backend/domain      | BE-007B         |
| `WBL-FE-009`     | P1       | Shared loading/error/toast/confirm UX        | COMPLETE   | Codex              | FE-007          |
| `WBL-FE-010`     | P1       | Customer list/detail/balance UI              | PLANNED    | Frontend           | Data/API        |
| `WBL-FE-011`     | P1       | Product create/edit/import UI                | PLANNED    | Frontend           | Catalogue API   |
| `WBL-FE-012`     | P1       | Purchase/supplier workflow UI                | PLANNED    | Frontend           | Purchase API    |
| `WBL-QA-003`     | P1       | Accessibility/responsive audit               | COMPLETE   | Codex              | FE-008/009      |
| `WBL-INFRA-001`  | P1       | CI build/test/format pipeline                | CONFIGURED | Codex              | Initial push    |
| `WBL-DOMAIN-001` | P0       | Accountant-approved transaction fixtures     | BLOCKED    | Accountant/product | External review |
| `WBL-DOMAIN-002` | P0       | GST invoice fixture approval                 | BLOCKED    | GST practitioner   | External review |

## Assignment protocol

```text
Assignee: <name>
Assigned: YYYY-MM-DD HH:mm:ss IST
Started: YYYY-MM-DD HH:mm:ss IST | not started
Branch/PR: <reference or N/A>
Expected completion: <date or unscheduled>
```

Split work only with child IDs such as `WBL-FE-007A`; never reuse an ID for unrelated work.
