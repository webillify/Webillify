# V1 pilot plan

Status: Assumption-driven rollout plan.

## Participants

Recruit two or three businesses, ideally:

- One home-appliance retailer
- One grocery or organic store
- One additional multi-branch local retailer only if support capacity allows

Candidate names in the discovery notes are leads, not confirmed participants.

## Entry criteria

- Signed pilot terms, privacy terms, data-processing responsibilities, and production-use disclaimer
- Named owner, manager, cashier, and Webillify support contact
- Verified company/GST profile and approved sample invoices
- Product/customer/supplier import rehearsed in a test organization
- Backup restore, tenant-isolation, invoice calculation, and role tests passed
- Clear rollback/export route to the participant's prior process

## Rollout

### Week 0: discovery and data preparation

Map current workflows, hardware, tax cases, connectivity, volume, peak hours, and reports. Clean and import master data.

### Week 1: shadow mode

Train users and run selected transactions alongside the existing system. Compare totals, tax, stock, and closing daily.

### Weeks 2–3: controlled live use

Use Webillify for one register or branch with daily support. Freeze non-critical custom requests.

### Weeks 4–6: stabilized pilot

Expand only after accuracy and recovery gates pass. Trial Webillify AI with a separate opt-in and no autonomous posting.

## Success measures

- No tenant data leak or unrecoverable data loss
- 100% match against approved invoice calculation samples
- At least 98% successful posting attempts excluding confirmed connectivity outages
- Median checkout under 45 seconds after product selection
- Stock variance below 2% on controlled sample counts after stabilization
- At least 80% of invoices created without staff assistance by week four
- Daily closing completed on at least 90% of active days
- Fewer than five unresolved severity-2 defects at pilot exit and no severity-1 defect

## Support and incident rules

- Publish support hours and escalation contacts; do not promise unlimited support.
- Severity 1: data exposure, unrecoverable loss, or inability to bill at all—immediate escalation and go-live pause.
- Severity 2: material calculation, stock, or payment error with workaround—same-business-day triage.
- Every production data correction requires an audit record and participant confirmation.

## AI pilot rules

- AI is separately enabled per organization and shown as a separate subscription trial.
- Users must approve every extracted purchase draft or suggested action.
- Measure extraction accuracy, correction time, adoption, cost per active organization, and rejected suggestions.
- Disable an AI capability if it creates material financial errors or cannot explain source evidence.

## Exit decision

At week six, decide `graduate`, `extend`, or `stop` using the metrics, open defects, support load, willingness to pay, and accounting/GST sign-off. Pilot-specific requests enter product review; they do not automatically become core features.
