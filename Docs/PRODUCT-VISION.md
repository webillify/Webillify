# Product vision

Status: Committed for V1 product direction; market assumptions require pilot validation.

## One-sentence definition

Webillify is a multi-company, multi-branch billing, POS, inventory, and business-operations platform built for Indian small and medium retail businesses.

## Initial customer

V1 focuses on two segments:

1. Home-appliance retailers that track serialised or high-value stock, partial payments, delivery status, and branch inventory.
2. Grocery and organic stores that need barcode-first billing, fast product search, tax handling, stock control, and daily cash closing.

The buyer is normally the owner or operating partner of a one-to-three-branch retail business. Cashiers, managers, inventory staff, and accountants are daily users.

## Problem

Small retailers often split billing, inventory, purchases, expenses, credit follow-up, and reporting across paper, spreadsheets, messaging apps, and accounting software. This causes duplicate entry, uncertain stock, missed receivables, slow closing, and poor branch visibility.

## Product promise

Webillify provides one Tamil/English-friendly workflow from purchase and stock-in through POS sale, payment, return, daily closing, and owner reporting. Routine billing must remain fast and usable without the AI subscription.

## Differentiation

- Retail-first, minimal-click POS instead of a general ERP interface
- Multi-company and multi-branch controls from the start
- India-specific GST and invoice workflow, subject to professional validation
- Simple migration and guided onboarding for local businesses
- Optional AI assistance sold separately, with human approval for financial records

## Product principles

- A posted invoice is a controlled business record, not an editable form.
- Stock changes only through traceable stock movements.
- Tenant and branch access is enforced by the API and database query layer.
- Entitlements are enforced server-side, not only hidden in the UI.
- AI may propose or explain; an authorised user approves accounting-impacting actions.
- V1 is a modular monolith, not a microservice estate.

## V1 boundaries

Webillify V1 is not a complete ERP, payroll system, manufacturing system, marketplace, e-commerce platform, or statutory filing service. Full general-ledger accounting, e-invoicing, e-way bills, composition-scheme workflows, and full offline invoice posting are later candidates.

## Success measures

- Median normal checkout completed in under 45 seconds after product selection
- At least 99.5% application availability during declared pilot business hours
- No cross-organization data exposure
- Stock variance below 2% for pilot-controlled product samples after stabilization
- At least 80% of pilot invoices created without staff assistance by week four
- Daily closing completed on at least 90% of active pilot days
