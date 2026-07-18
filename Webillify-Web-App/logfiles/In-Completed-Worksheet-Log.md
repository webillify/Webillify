# Webillify incomplete work worksheet

Last updated: **2026-07-18 19:17:32 IST**
In progress: **WBL-FE-010 — Codex — customer balances and receipt workflow**
Ready next: **WBL-BE-009 reports, exports and POS closing after FE-010**

## Ready

| Task ID      | Priority | Module/outcome                   | Assignee | Status      |
| ------------ | -------- | -------------------------------- | -------- | ----------- |
| `WBL-FE-010` | P1       | Customers, balances and receipts | Codex    | IN PROGRESS |

## Planned frontend

| Task ID      | Priority | Module                              | Dependency          |
| ------------ | -------- | ----------------------------------- | ------------------- |
| `WBL-FE-010` | P1       | Customers, balances and receipts    | Data layer/API      |
| `WBL-FE-011` | P1       | Product create/edit/import          | Catalogue API       |
| `WBL-FE-012` | P1       | Suppliers and purchase bills        | Purchase API        |
| `WBL-FE-013` | P1       | Reports and exports                 | Report APIs         |
| `WBL-FE-014` | P1       | Company/branch/users/roles/settings | Tenancy APIs        |
| `WBL-FE-015` | P1       | Core subscription/usage screens     | Subscription APIs   |
| `WBL-AI-001` | P2       | Separate AI plan and credit UI      | AI subscription API |

## Planned backend, quality and operations

| Task ID         | Priority     | Module                                         | Status          |
| --------------- | ------------ | ---------------------------------------------- | --------------- |
| `WBL-BE-001`    | P0           | NestJS API foundation                          | COMPLETE        |
| `WBL-BE-002`    | P0           | PostgreSQL tenancy schema                      | COMPLETE        |
| `WBL-BE-003`    | P0           | Identity and sessions                          | COMPLETE — CORE |
| `WBL-BE-004`    | P0           | Organization/branch/RBAC                       | COMPLETE        |
| `WBL-BE-005`    | P0           | Core and AI subscription entitlements          | COMPLETE        |
| `WBL-BE-006`    | P0           | Catalogue and inventory ledger                 | COMPLETE        |
| `WBL-BE-007A`   | P0           | Purchases/payables database foundation         | COMPLETE        |
| `WBL-BE-007B`   | P0           | Purchase/payable API and posting effects       | COMPLETE        |
| `WBL-BE-007C`   | P0           | Purchase cancellation and return workflows     | COMPLETE        |
| `WBL-BE-008A`   | P0           | POS persistence database foundation            | COMPLETE        |
| `WBL-BE-008B`   | P0           | Protected atomic POS posting API               | COMPLETE        |
| `WBL-FE-016D`   | P0           | Connected POS session/invoice browser workflow | COMPLETE        |
| `WBL-BE-008C`   | P0           | Sales cancellation/return/credit compensation  | COMPLETE        |
| `WBL-FE-016E`   | P0           | Sales history and compensation browser actions | COMPLETE        |
| `WBL-BE-008`    | P0           | POS/invoice/payment/returns                    | READY           |
| `WBL-BE-009`    | P1           | Reports/exports/closing                        | PLANNED         |
| `WBL-QA-002`    | P0           | Feature unit tests                             | COMPLETE        |
| `WBL-QA-003`    | P1           | Accessibility/responsive audit                 | COMPLETE        |
| `WBL-QA-004`    | P0 pre-pilot | Critical-flow E2E                              | PLANNED         |
| `WBL-SEC-001`   | P0           | Tenant/branch authorization tests              | COMPLETE        |
| `WBL-INFRA-001` | P1           | CI pipeline                                    | CONFIGURED      |
| `WBL-INFRA-002` | P1           | Environments/secrets/deployment                | PLANNED         |
| `WBL-INFRA-003` | P1           | Monitoring/incident runbook                    | PLANNED         |
| `WBL-INFRA-004` | P0 pre-pilot | Backup/restore rehearsal                       | PLANNED         |

## Externally blocked validation

| Task ID          | Blocker                                                | Required resolution                |
| ---------------- | ------------------------------------------------------ | ---------------------------------- |
| `WBL-DOMAIN-001` | Accounting posting rules not professionally approved   | Accountant-approved fixtures       |
| `WBL-DOMAIN-002` | GST workflow/invoice cases not professionally approved | GST-practitioner sign-off          |
| `WBL-BIZ-001`    | Pricing/AI limits not pilot validated                  | Cost and willingness-to-pay review |

Detailed acceptance and assignment order: [Task-Backlog.md](Task-Backlog.md).
