# Webillify task backlog

Last prioritized: **2026-07-17 17:27:22 IST**  
Active assignee: **Codex — WBL-BE-001 started 2026-07-17 17:27:22 IST**  
WIP limit: **One P0 task per engineer**

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

## Recommended next task

### WBL-BE-001 — NestJS API foundation

Status: **IN PROGRESS — started 2026-07-17 17:27:22 IST**

- Scaffold a strict NestJS API with `/api/v1`, validated configuration and structured errors.
- Add correlation IDs, secure defaults, health/readiness endpoints and generated OpenAPI.
- Add unit/integration tests and independent build/format commands.

## Prioritized queue

| Task ID          | Priority | Task                                         | Status      | Suggested owner    | Depends on      |
| ---------------- | -------- | -------------------------------------------- | ----------- | ------------------ | --------------- |
| `WBL-FE-007`     | P0       | Typed data/state foundation                  | COMPLETE    | Codex              | Phase 1         |
| `WBL-SETUP-002`  | P0       | Environments and API URL contract            | COMPLETE    | Codex              | None            |
| `WBL-FE-008`     | P0       | Auth state, guards and permission primitives | COMPLETE    | Codex              | FE-007          |
| `WBL-QA-002`     | P0       | Dashboard/POS/products unit tests            | COMPLETE    | Codex              | FE-007          |
| `WBL-BE-001`     | P0       | NestJS scaffold and health endpoint          | IN PROGRESS | Codex              | API spec        |
| `WBL-BE-002`     | P0       | PostgreSQL tenancy schema/migrations         | PLANNED     | Backend            | BE-001          |
| `WBL-SEC-001`    | P0       | Tenant/branch authorization harness          | PLANNED     | Backend/security   | BE-002          |
| `WBL-FE-009`     | P1       | Shared loading/error/toast/confirm UX        | COMPLETE    | Codex              | FE-007          |
| `WBL-FE-010`     | P1       | Customer list/detail/balance UI              | PLANNED     | Frontend           | Data/API        |
| `WBL-FE-011`     | P1       | Product create/edit/import UI                | PLANNED     | Frontend           | Catalogue API   |
| `WBL-FE-012`     | P1       | Purchase/supplier workflow UI                | PLANNED     | Frontend           | Purchase API    |
| `WBL-QA-003`     | P1       | Accessibility/responsive audit               | COMPLETE    | Codex              | FE-008/009      |
| `WBL-INFRA-001`  | P1       | CI build/test/format pipeline                | CONFIGURED  | Codex              | Initial push    |
| `WBL-DOMAIN-001` | P0       | Accountant-approved transaction fixtures     | BLOCKED     | Accountant/product | External review |
| `WBL-DOMAIN-002` | P0       | GST invoice fixture approval                 | BLOCKED     | GST practitioner   | External review |

## Assignment protocol

```text
Assignee: <name>
Assigned: YYYY-MM-DD HH:mm:ss IST
Started: YYYY-MM-DD HH:mm:ss IST | not started
Branch/PR: <reference or N/A>
Expected completion: <date or unscheduled>
```

Split work only with child IDs such as `WBL-FE-007A`; never reuse an ID for unrelated work.
