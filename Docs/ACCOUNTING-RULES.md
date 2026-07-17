# Accounting and transaction rules

Status: Product rules for V1. Journal descriptions are conceptual because V1 does not include a full general ledger. A qualified Indian accountant must approve the test vectors before production.

## Record lifecycle

- `draft`: editable, has no stock, receivable, payable, tax, or invoice-series effect.
- `posted`: immutable business record; creates all relevant balance and stock effects atomically.
- `cancelled`: original remains visible and linked compensating effects are created.
- `void` is reserved for an allocated invoice number that was not completed; reason and audit trail are mandatory.
- Hard deletion of posted financial or stock records is prohibited.

## Numeric rules

- Money is stored as fixed decimal values, never binary floating point.
- Currency is INR in V1, stored with two decimal places.
- Quantity supports up to three decimal places; units may restrict allowed precision.
- Unit price and unit cost support four decimal places for calculation.
- Calculate taxable value per line after line discount, then tax per line, then aggregate.
- Store the applied rate, taxable amount, tax components, and rounding on each posted line; never recalculate history from the current tax master.
- Invoice round-off is a separate signed amount. The default absolute limit is ₹0.99 and is configurable only by an owner.

## Sales invoice

Posting a sale conceptually produces:

- Debit cash/bank/UPI/card clearing for amounts received
- Debit customer receivable for the unpaid amount
- Credit sales revenue for taxable value net of discount
- Credit output CGST/SGST or output IGST
- Debit cost of goods sold and credit inventory at the configured valuation cost

Payment mode does not change invoice revenue or tax. A later receipt reduces customer receivable and increases the selected payment account.

## Purchase bill

Posting a purchase conceptually produces:

- Debit inventory or expense for taxable value and non-creditable charges
- Debit eligible input CGST/SGST or input IGST
- Credit cash/bank for paid amount
- Credit supplier payable for unpaid amount

Input-tax eligibility is captured explicitly; the system does not assume every tax amount is creditable.

## Returns

- A sales return is linked to the original invoice and cannot exceed the sold quantity less previous returns.
- A valid sales return reduces revenue/output tax or creates the configured credit-note treatment, and returns saleable goods to stock at the original cost basis where available.
- A purchase return reduces supplier payable or creates a supplier receivable, reverses eligible input tax as approved, and removes stock at the configured valuation cost.
- Damaged or scrapped returned items do not enter saleable stock.

## Discounts, charges, and round-off

- Discounts may be line-level or invoice-level; invoice discount is allocated proportionally across eligible lines before tax.
- A discount cannot make taxable value negative.
- Freight or other charges have an explicit tax treatment and allocation rule; they are not silently merged into product price.
- Users need a separate permission to exceed configured discount or below-cost thresholds.

## Customer and supplier balances

- Balances are derived from posted invoices/bills, receipts/payments, returns, credit/debit notes, and opening balances.
- Receipts and payments are separate immutable records with allocations; changing an allocation does not rewrite the source invoice.
- Unallocated receipts/payments remain visible as advances.
- Negative balances are allowed only as explicit advances or credits, not as calculation errors.

## Cancellation and correction

- Cancellation requires a reason and permission, and is blocked when a dependent return or allocation cannot be safely reversed.
- Cancellation creates compensating stock, tax, and balance effects in one transaction.
- Posted invoice identity, number, timestamp, original content, cancellation actor, and reason remain auditable.
- Backdating is permission-controlled and cannot target a locked financial period.

## Financial year and invoice series

- A financial year does not delete or reset data; it starts a new configured invoice series.
- Invoice numbers are unique per company, document type, financial year, and series.
- Final numbers are allocated server-side during posting and are never reused.
- Sequence gaps remain visible with an explanation; numbers are not renumbered.

## Stock valuation

V1 uses weighted-average cost per product variant and warehouse. The average changes on purchase/positive adjustment and is applied to sale/negative movement. Returns use original transaction cost when available. Changing valuation method after live posting is outside V1.

## Period locking

An organization owner or accountant may lock transactions through a date. Posting, cancellation, or backdating into a locked period is rejected except through an audited break-glass workflow reserved for later implementation.

## Required validation set

Before launch, approved examples must cover intrastate/interstate sale, inclusive/exclusive price, discount allocation, split payment, partial credit, sales and purchase return, round-off, cancelled invoice, tax-rate change, and financial-year series rollover.
