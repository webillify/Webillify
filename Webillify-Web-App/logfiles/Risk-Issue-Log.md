# Webillify risk and issue log

Last reviewed: **2026-07-17 20:36:50 IST**

| ID             | Type           | Severity | Risk/issue                                                           | Evidence                                                        | Mitigation/next action                                    | Owner                | Status                                |
| -------------- | -------------- | -------- | -------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- | -------------------- | ------------------------------------- |
| `WBL-RISK-001` | Risk           | CRITICAL | Frontend was not integrated with backend persistence                 | Auth/catalogue/stock/purchases/plans browser journeys pass      | Continue adapters with BE-008                             | Full stack           | MITIGATED — CURRENT SURFACE CONNECTED |
| `WBL-RISK-002` | Resolved risk  | HIGH     | Angular used demo auth despite secure identity API being ready       | Real login/token/refresh/tenant browser tests pass              | Retain connected auth journey as release gate             | Full stack           | RESOLVED 2026-07-17 19:34:26 IST      |
| `WBL-RISK-003` | Resolved issue | HIGH     | Pages directly imported mock data                                    | No page mock-data imports remain                                | Typed repositories and explicit modes shipped in FE-007   | Frontend             | RESOLVED 2026-07-17 16:51:48 IST      |
| `WBL-RISK-004` | Risk           | HIGH     | Full-stack regression coverage remains incomplete                    | Frontend 23+4 connected and API 3+62 tests pass                 | Expand QA-004 as transaction modules land                 | QA/backend           | MITIGATING                            |
| `WBL-RISK-005` | Risk           | CRITICAL | Accounting/GST rules lack professional approval                      | Product docs label validation gate                              | DOMAIN-001/002 before transaction release                 | Product              | BLOCKED EXTERNAL                      |
| `WBL-RISK-006` | Resolved risk  | HIGH     | Tenant leakage was untested before tenancy existed                   | SEC-001 cross-tenant/branch/permission matrix pass              | Retain matrix as a release-blocking CI gate               | Security/backend     | RESOLVED 2026-07-17 18:07:26 IST      |
| `WBL-RISK-007` | Risk           | MEDIUM   | PWA install/offline behavior lacks browser-device QA                 | Build artifact only                                             | Add QA checklist/update prompt                            | Frontend/QA          | OPEN                                  |
| `WBL-RISK-008` | Risk           | MEDIUM   | Proposed pricing and AI credits may not cover costs                  | Pricing marked assumption                                       | Pilot cost/usage review                                   | Product/business     | OPEN                                  |
| `WBL-RISK-009` | Resolved issue | HIGH     | Requested GitHub remote initially rejected writes                    | `main` push succeeded and tracks `origin/main`                  | Continue protected-branch and CI configuration on GitHub  | Project owner/DevOps | RESOLVED 2026-07-17 18:09:39 IST      |
| `WBL-RISK-010` | Risk           | MEDIUM   | SVG-only PWA icon may not meet every platform's install requirements | Manifest contains one SVG icon                                  | Add tested 192/512 maskable PNG assets                    | Frontend/design      | OPEN                                  |
| `WBL-RISK-011` | Resolved issue | HIGH     | Active phase sheet contained unrelated Ageera history                | Archived file names Ageera domains/modules                      | Preserved in archive; replaced with Webillify phase sheet | Project tracking     | RESOLVED 2026-07-17 16:35:25 IST      |
| `WBL-RISK-012` | Resolved risk  | HIGH     | Posted purchases lacked safe cancellation and return compensation    | 57 API tests cover dependencies, credits, stock and concurrency | Retain BE-007C matrix as a release gate                   | Backend/domain       | RESOLVED 2026-07-17 20:15:08 IST      |

## Severity response

- `CRITICAL`: blocks production/pilot release; assign immediately when its dependency becomes available.
- `HIGH`: must be resolved in the current or next release.
- `MEDIUM`: schedule and monitor; cannot be silently ignored.
- `LOW`: improve when capacity permits.

## New risk template

```markdown
| `WBL-RISK-NNN` | Risk/Issue | severity | Description | Evidence | Mitigation | Owner | OPEN/BLOCKED/RESOLVED |
```
