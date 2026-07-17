# Webillify project goals

Last updated: **2026-07-17 16:51:48 IST**

## Product goal

Build a simple, dependable, multi-company and multi-branch billing, POS, inventory, and business-operations platform for Indian small and medium retailers. Home-appliance and grocery/organic retailers are the first V1 segments.

Core billing must remain available without AI. Webillify AI is a separate optional subscription that can prepare drafts and insights but cannot autonomously post financial or stock changes.

## Current release goal — R0 Frontend foundation

Status: **COMPLETE**  
Completed: **2026-07-17 16:24:18 IST**

Success criteria:

- [x] Angular standalone application created with strict TypeScript
- [x] Responsive desktop/mobile shell and lazy routes
- [x] Dashboard, POS and product catalogue demonstrate core interaction direction
- [x] PWA manifest and service worker included in production build
- [x] Production build and baseline unit test pass
- [x] Demo-only data and behavior are explicitly identified

## Active release goal — R1 Frontend MVP foundation

Status: **COMPLETE — 2026-07-17 17:22:35 IST**  
Target: Not scheduled  
Owner: Unassigned

Success criteria:

- [x] Typed domain models and repository interfaces isolate pages from data source
- [x] Environment configuration supports mock and future API modes
- [x] Authentication state, route guards and permission primitives exist
- [x] Reusable loading, error, empty-state, confirmation and toast patterns exist
- [x] Dashboard, POS and products have focused unit tests
- [x] Accessibility and responsive QA checklist passes

## Future release goals

| Goal ID    | Release | Objective                                    | Status   | Exit gate                                                          |
| ---------- | ------- | -------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `WBL-G001` | R0      | Frontend foundation prototype                | COMPLETE | Build/test/PWA evidence recorded                                   |
| `WBL-G002` | R1      | Maintainable frontend application foundation | READY    | Pages use typed repositories; auth/guards/test primitives exist    |
| `WBL-G003` | R2      | Backend tenancy and identity foundation      | PLANNED  | Organization/branch/user/role/subscription APIs pass tenant tests  |
| `WBL-G004` | R3      | Products, inventory and purchases            | PLANNED  | Movement ledger and weighted-average rules pass fixtures           |
| `WBL-G005` | R4      | Transactional POS and receivables            | PLANNED  | Posted invoices are idempotent, immutable and GST fixture-approved |
| `WBL-G006` | R5      | Reports, exports and operational closing     | PLANNED  | Essential reports reconcile to source transactions                 |
| `WBL-G007` | R6      | Separate Webillify AI pilot                  | PLANNED  | Human-review, privacy, cost and cross-tenant evaluation gates pass |
| `WBL-G008` | R7      | Controlled customer pilot                    | PLANNED  | Pilot metrics and launch decision completed                        |

## Non-negotiable quality goals

- Zero cross-organization or unauthorized cross-branch data access
- No duplicate invoice, payment or stock movement caused by retry
- Posted financial records are corrected through traceable reversal, never silent edit/delete
- Core POS remains functional when AI is disabled, unavailable or out of credits
- GST/accounting calculations are approved using professional test vectors before production claims
- Backup restoration is rehearsed before pilot go-live
- Every completed development task has timestamped evidence in these logs

## Out of scope for V1

Full general-ledger accounting, payroll, manufacturing, e-commerce, automated GST filing, e-invoice/e-way bill integration, native mobile apps, full offline final posting, and autonomous AI actions.
