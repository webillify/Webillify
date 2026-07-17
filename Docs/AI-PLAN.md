# Webillify AI subscription

Status: Separate optional subscription; launch limits and price are assumptions to validate in pilot.

## Product rule

Webillify AI is not a fourth core tier. It is an add-on subscription attached to an organization with an active Starter, Business, or Pro plan. Cancelling or exhausting AI never blocks normal billing, POS, inventory, reports, or access to previously posted records.

## V1 capabilities

- Extract a purchase bill image/PDF into a reviewable draft with source highlights
- Answer natural-language questions using the user's permitted reports and branches
- Summarize sales, stock, receivable, payable, and cash-closing trends
- Suggest unusual stock, discount, return, or payment patterns for review
- Draft customer payment reminders in Tamil or English

## Prohibited autonomous behavior

AI cannot post, cancel, refund, change stock, modify prices/taxes, send customer messages, or alter permissions without a separate deterministic validation and explicit authorised-user confirmation. AI output is not accounting, tax, or legal advice.

## Entitlement

- Proposed price: ₹799 per organization/month plus applicable GST
- Includes 1,500 AI credits per billing month
- 14-day trial with 300 credits, once per organization
- Optional 1,000-credit pack: ₹299; automatic overage is off by default
- Unused monthly credits expire; purchased credit packs expire after 12 months
- Limits and prices require observed model-cost and willingness-to-pay validation

### Credit mapping

| Action | Credits |
| --- | ---: |
| Text question or reminder draft | 1 |
| Report summary or anomaly scan | 3 |
| One document/image page extraction | 5 |

The API returns estimated credits before a chargeable operation when practical. Failed provider calls, blocked safety requests, and server errors do not consume credits. A successfully returned result consumes credits even if the user rejects it.

## Permissions and privacy

- Organization owner enables the subscription and selects which roles may use each capability.
- AI receives only the minimum organization/branch data required for the request.
- Provider training on customer content must be disabled contractually and technically where supported.
- Prompts, source references, output, model/provider, credit charge, user, and approval/rejection are audited with sensitive values minimized.
- Raw uploaded documents follow tenant retention policy and can be deleted independently after extraction where legally allowed.
- Cross-tenant retrieval is tested as a release blocker.

## Reliability behavior

- Every extraction displays confidence and the source region for critical fields.
- Low-confidence supplier, GSTIN, invoice number, item, quantity, tax, or total fields require review.
- Provider outage degrades to normal manual workflows.
- Provider and model changes require regression tests against an approved redacted evaluation set.

## Success measures

- At least 90% field accuracy on the pilot document set before user correction
- At least 30% reduction in median purchase-entry time
- Fewer than 1% materially misleading report answers in the reviewed evaluation set
- At least 25% weekly use among enabled pilot organizations
- Positive gross margin after provider, storage, and support cost
