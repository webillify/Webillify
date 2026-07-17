# Subscription plans

Status: Launch assumptions. Limits and prices must be tested during the pilot.

## Core plans

| Entitlement | Starter | Business | Pro |
| --- | ---: | ---: | ---: |
| Proposed monthly price, excluding GST | ₹499 | ₹999 | ₹1,999 |
| Companies | 1 | 1 | 3 |
| Branches | 1 | 3 | 10 |
| Active users | 2 | 10 | 30 |
| Posted sales invoices/month | 2,000 | 10,000 | 50,000 |
| Billing and inventory | Yes | Yes | Yes |
| Purchases and expenses | Basic | Yes | Yes |
| Standard reports | Yes | Yes | Yes |
| Branch transfers | No | Yes | Yes |
| Serial-number capture | No | Yes | Yes |
| Advanced exports and margin reports | No | Yes | Yes |
| Custom roles and public API | No | No | Post-pilot enablement |
| Support | Standard | Business hours | Priority business hours |

Annual billing is proposed at ten times the monthly price. The exact discount and refund policy require commercial validation.

## Separate Webillify AI subscription

Webillify AI is a separately purchased add-on for any active core plan. Proposed price is ₹799 per organization/month plus GST with 1,500 monthly AI credits. It is not bundled into Pro and does not change core company, branch, user, or invoice limits. Full rules are in [AI-PLAN.md](AI-PLAN.md).

## Entitlement rules

- Limits are stored as versioned plan entitlements and enforced by the API in the same transaction as the protected action.
- The UI may explain limits but is never the enforcement boundary.
- Existing records remain readable after downgrade; creating new records beyond the lower limit is blocked until usage is reduced or the plan is upgraded.
- Posted invoices are never hidden or deleted because a plan expires.
- User, company, and branch limits count active records. Invoice and AI limits reset at the subscription billing boundary.
- Platform administrators may grant a time-limited, audited pilot override with a reason and expiry.

## Lifecycle

1. `trialing`: full selected-plan entitlements until trial expiry.
2. `active`: paid and usable.
3. `past_due`: grace period; notify owner and limit non-essential mutations only after the documented grace period.
4. `suspended`: read/export access for owners; new posting blocked except an explicitly supported emergency policy.
5. `cancelled`: read/export retention follows contract and law; data is not immediately deleted.

Core and AI subscriptions have independent lifecycle states. AI may be suspended while core remains active.

## Billing requirements

- Store gateway customer/subscription references, never raw card details.
- Verify webhook signatures and process events idempotently.
- Generate a Webillify subscription tax invoice using the platform company's approved GST treatment.
- Proration, refunds, grace period, retention, and cancellation terms must be published before paid launch.
