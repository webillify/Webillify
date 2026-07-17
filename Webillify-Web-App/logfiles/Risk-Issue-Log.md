# Webillify risk and issue log

Last reviewed: **2026-07-17 17:49:06 IST**

| ID             | Type           | Severity | Risk/issue                                                           | Evidence                                          | Mitigation/next action                                    | Owner                | Status                           |
| -------------- | -------------- | -------- | -------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | -------------------- | -------------------------------- |
| `WBL-RISK-001` | Risk           | CRITICAL | Frontend is not yet integrated with backend persistence              | API/database foundations exist; UI still mock     | Complete BE modules and frontend API adapters             | Full stack           | MITIGATING                       |
| `WBL-RISK-002` | Risk           | CRITICAL | Authentication is local demo state, not a secure server session      | FE-008 guards UI only; no identity API            | Implement BE-003; frontend portion mitigated              | Backend              | MITIGATED — BACKEND OPEN         |
| `WBL-RISK-003` | Resolved issue | HIGH     | Pages directly imported mock data                                    | No page mock-data imports remain                  | Typed repositories and explicit modes shipped in FE-007   | Frontend             | RESOLVED 2026-07-17 16:51:48 IST |
| `WBL-RISK-004` | Risk           | HIGH     | Full-stack regression coverage remains incomplete                    | 19 unit + 6 frontend E2E pass; no backend         | Expand QA-004 as real modules land                        | QA/backend           | MITIGATED FRONTEND — API OPEN    |
| `WBL-RISK-005` | Risk           | CRITICAL | Accounting/GST rules lack professional approval                      | Product docs label validation gate                | DOMAIN-001/002 before transaction release                 | Product              | BLOCKED EXTERNAL                 |
| `WBL-RISK-006` | Risk           | HIGH     | Tenant leakage cannot be tested until tenancy exists                 | No API/database                                   | Build SEC-001 with BE-002/004                             | Security/backend     | OPEN                             |
| `WBL-RISK-007` | Risk           | MEDIUM   | PWA install/offline behavior lacks browser-device QA                 | Build artifact only                               | Add QA checklist/update prompt                            | Frontend/QA          | OPEN                             |
| `WBL-RISK-008` | Risk           | MEDIUM   | Proposed pricing and AI credits may not cover costs                  | Pricing marked assumption                         | Pilot cost/usage review                                   | Product/business     | OPEN                             |
| `WBL-RISK-009` | Issue          | HIGH     | Local Git/CI exist, but requested GitHub remote rejects writes       | HTTPS push returned 403; GitHub app has no access | Grant authenticated user or app write access              | Project owner/DevOps | BLOCKED EXTERNAL                 |
| `WBL-RISK-010` | Risk           | MEDIUM   | SVG-only PWA icon may not meet every platform's install requirements | Manifest contains one SVG icon                    | Add tested 192/512 maskable PNG assets                    | Frontend/design      | OPEN                             |
| `WBL-RISK-011` | Resolved issue | HIGH     | Active phase sheet contained unrelated Ageera history                | Archived file names Ageera domains/modules        | Preserved in archive; replaced with Webillify phase sheet | Project tracking     | RESOLVED 2026-07-17 16:35:25 IST |

## Severity response

- `CRITICAL`: blocks production/pilot release; assign immediately when its dependency becomes available.
- `HIGH`: must be resolved in the current or next release.
- `MEDIUM`: schedule and monitor; cannot be silently ignored.
- `LOW`: improve when capacity permits.

## New risk template

```markdown
| `WBL-RISK-NNN` | Risk/Issue | severity | Description | Evidence | Mitigation | Owner | OPEN/BLOCKED/RESOLVED |
```
