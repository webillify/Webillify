# Business flows

## 1. Organization onboarding

1. Owner creates an organization and first company.
2. Owner enters GST and address details, financial year, invoice series, timezone, and currency.
3. Owner creates branches, registers, warehouses, users, and roles.
4. Products and opening stock are imported or entered.
5. A manager verifies sample invoice totals and opening stock before go-live.

## 2. Purchase to stock

1. User selects a supplier and creates a draft purchase bill.
2. Items, quantities, costs, discounts, taxes, and supplier invoice reference are entered.
3. An authorised user posts the bill.
4. Posting creates supplier payable, tax summary entries, and stock-in movements.
5. Later payments reduce supplier outstanding without changing the posted bill.
6. Purchase return creates a linked return document, stock-out movements, and supplier balance adjustment.

If Webillify AI is active, a bill image/PDF may populate the draft. A user must review supplier, item mapping, quantity, tax, and totals before posting.

## 3. POS sale

1. Cashier opens a POS session with declared opening cash.
2. Products are scanned or searched; quantity, allowed discount, customer, and delivery notes are added.
3. Server validates stock policy, price permissions, tax, subscription, branch, and invoice series.
4. Cashier records one or more payments.
5. Server atomically assigns the invoice number, posts invoice/items/payments, and creates stock-out movements.
6. Receipt is printed or shared.

Retries use an idempotency key so a network retry cannot create a duplicate invoice.

## 4. Credit sale and receipt

1. Authorised user selects an existing customer and credit terms.
2. Invoice posting increases customer outstanding by the unpaid amount.
3. A later receipt is allocated to one or more invoices.
4. Customer balance and allocation history update; the original invoice does not change.

## 5. Sales return

1. User locates the original invoice and selects returnable items.
2. System checks quantity already returned and return permissions.
3. Authorised user posts a credit note/return.
4. Saleable goods create stock-in movements; damaged goods enter a designated non-saleable location or are excluded with reason.
5. Refund or customer-credit treatment is recorded separately.

## 6. Branch transfer

1. Source branch creates and dispatches a transfer.
2. Stock moves from source on-hand to in-transit.
3. Destination branch receives accepted quantities.
4. Accepted stock enters destination; differences remain visible for resolution.

## 7. POS closing

1. Cashier declares counted cash.
2. System calculates expected cash from opening cash, cash sales/receipts, refunds, pay-outs, and pay-ins.
3. Variance is recorded with a reason; cashier submits closing.
4. Manager reviews or approves variances above the configured threshold.

## 8. Cancellation and correction

Posted records are never silently edited. An authorised cancellation or reversal records actor, time, reason, original values, and compensating balance/stock effects. If the invoice number must remain in sequence, its cancelled status remains visible.
