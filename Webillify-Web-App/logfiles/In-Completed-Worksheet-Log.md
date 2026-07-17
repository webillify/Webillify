# Webillify incomplete work worksheet

Last updated: **2026-07-17 20:15:08 IST**
In progress: **None — WBL-BE-007C verified; publication pending**
Ready next: **WBL-FE-016C purchase cancellation/return browser actions, then BE-008 real POS sales posting**

## Ready

| Task ID      | Priority | Module/outcome                 | Assignee | Status      |
| ------------ | -------- | ------------------------------ | -------- | ----------- |
| `WBL-FE-016C` | P0      | Purchase cancellation/return browser actions | Unassigned | READY |
| `WBL-BE-008`  | P0      | Real POS invoice/payment/return backend and browser completion | Unassigned | READY |

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
| `WBL-FE-016C` | P0      | Purchase cancellation/return actions | BE-007C             |

## Planned backend, quality and operations

| Task ID         | Priority     | Module                                | Status      |
| --------------- | ------------ | ------------------------------------- | ----------- |
| `WBL-BE-001`    | P0           | NestJS API foundation                 | COMPLETE    |
| `WBL-BE-002`    | P0           | PostgreSQL tenancy schema             | COMPLETE    |
| `WBL-BE-003`    | P0           | Identity and sessions                 | COMPLETE — CORE |
| `WBL-BE-004`    | P0           | Organization/branch/RBAC              | COMPLETE    |
| `WBL-BE-005`    | P0           | Core and AI subscription entitlements | COMPLETE    |
| `WBL-BE-006`    | P0           | Catalogue and inventory ledger        | COMPLETE    |
| `WBL-BE-007A`   | P0           | Purchases/payables database foundation | COMPLETE    |
| `WBL-BE-007B`   | P0           | Purchase/payable API and posting effects | COMPLETE    |
| `WBL-BE-007C`   | P0           | Purchase cancellation and return workflows | COMPLETE  |
| `WBL-BE-008`    | P0           | POS/invoice/payment/returns           | PLANNED     |
| `WBL-BE-009`    | P1           | Reports/exports/closing               | PLANNED     |
| `WBL-QA-002`    | P0           | Feature unit tests                    | COMPLETE    |
| `WBL-QA-003`    | P1           | Accessibility/responsive audit        | COMPLETE    |
| `WBL-QA-004`    | P0 pre-pilot | Critical-flow E2E                     | PLANNED     |
| `WBL-SEC-001`   | P0           | Tenant/branch authorization tests     | COMPLETE    |
| `WBL-INFRA-001` | P1           | CI pipeline                           | CONFIGURED  |
| `WBL-INFRA-002` | P1           | Environments/secrets/deployment       | PLANNED     |
| `WBL-INFRA-003` | P1           | Monitoring/incident runbook           | PLANNED     |
| `WBL-INFRA-004` | P0 pre-pilot | Backup/restore rehearsal              | PLANNED     |

## Externally blocked validation

| Task ID          | Blocker                                                | Required resolution                |
| ---------------- | ------------------------------------------------------ | ---------------------------------- |
| `WBL-DOMAIN-001` | Accounting posting rules not professionally approved   | Accountant-approved fixtures       |
| `WBL-DOMAIN-002` | GST workflow/invoice cases not professionally approved | GST-practitioner sign-off          |
| `WBL-BIZ-001`    | Pricing/AI limits not pilot validated                  | Cost and willingness-to-pay review |

Detailed acceptance and assignment order: [Task-Backlog.md](Task-Backlog.md).
