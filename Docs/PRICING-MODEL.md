# Pricing model

Status: Proposed launch pricing, not a final commercial commitment. All figures exclude applicable GST.

## Recurring prices

| Subscription | Monthly | Proposed annual | Notes |
| --- | ---: | ---: | --- |
| Starter | ₹499 | ₹4,990 | 1 company, 1 branch, 2 users |
| Business | ₹999 | ₹9,990 | 1 company, up to 3 branches, 10 users |
| Pro | ₹1,999 | ₹19,990 | Up to 3 companies, 10 branches, 30 users |
| Webillify AI add-on | ₹799 | ₹7,990 | Separate, 1,500 AI credits/month |

AI credit pack assumption: ₹299 per 1,000 credits. Auto-purchase is disabled unless an owner explicitly enables a spending limit.

## One-time services

| Service | Starting assumption |
| --- | ---: |
| Guided remote onboarding | ₹2,500 |
| Product/customer/supplier import | ₹2,500 per reviewed source file |
| On-site setup | Quoted by location and days |
| Custom report/integration | Separately scoped |
| Hardware, printer, scanner, or local server | Pass-through/quoted separately |

Pilot discounts must have a fixed end date and list price. Do not promise unlimited support, free customization, or permanent free migrations.

## Unit economics

Track monthly per organization:

- Application compute and database
- Object storage, bandwidth, PDFs, backups, and monitoring
- Payment-gateway and messaging fees
- AI provider cost by capability and credits consumed
- Onboarding, migration, and support labor
- Tax, refunds, failed payments, and bad debt
- Allocated engineering/operations cost

`Contribution margin = recurring revenue - variable infrastructure - gateway/messaging/AI cost - variable support cost`.

Target assumptions after pilot stabilization:

- Core gross margin at least 75%
- AI add-on gross margin at least 60%
- Routine support below 45 minutes per active organization/month
- Paid acquisition payback below 12 months when acquisition spending begins

## Pricing validation

During pilot, test willingness to pay separately for core and AI. Record invoice volume, active users, branches, support time, storage, AI cost, and requested features. Revise limits before public launch if a normal target customer would repeatedly exceed them.

## Guardrails

- Price changes create new plan versions; existing invoices retain the purchased terms.
- Entitlements and prices are not hard-coded into the client.
- Taxes are calculated separately from displayed pre-tax price.
- Usage meters are visible to organization owners before limits are reached.
- AI usage can be stopped without affecting the core subscription.
