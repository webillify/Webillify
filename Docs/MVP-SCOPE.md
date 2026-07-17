# V1 MVP scope

Status: Committed unless marked `Later` or `Assumption`.

## Included

### Foundation

- Email or mobile login, password reset, session management, and login history
- Organization, company, branch, user, role, and permission management
- One active subscription with server-side entitlement enforcement
- Company tax profile, branch address, financial year, and invoice series
- Immutable audit events for sensitive actions

### Catalogue and inventory

- Products, variants, categories, units, barcodes, HSN/SAC, tax rates, sale price, and purchase cost
- Opening stock, purchase receipt, sale issue, sales return, purchase return, adjustment, and branch transfer
- Stock-on-hand and movement ledger per branch/warehouse
- Low-stock list and CSV product import
- Optional serial number capture for appliance items; warranty management is Later

### POS and sales

- Barcode scan and fast search
- Cash, card, UPI, bank, credit, and split payment recording
- GST tax invoice, thermal/A4 print, PDF, and shareable link
- Hold/resume cart while online
- Sales return and credit note linked to the original invoice
- Customer balances, receipts, and payment history
- POS session opening, cash movement, closing, and variance

### Purchases and expenses

- Suppliers, purchase bills, supplier balances, payments, and purchase returns
- Expense categories and branch expenses
- Attachment upload for supporting documents

### Reports

- Daily/period sales, tax summary, payment-method summary, cash closing
- Stock on hand, stock movements, low stock, stock valuation
- Customer receivables and supplier payables
- CSV export with role and branch restrictions

### Separate AI subscription

Webillify AI is optional and separately billed. Its V1 capabilities are purchase-document extraction into a draft, natural-language business queries, report summaries, anomaly suggestions, and customer follow-up draft text. See [AI-PLAN.md](AI-PLAN.md).

## Explicitly excluded from V1

- Full double-entry general ledger, bank reconciliation, payroll, manufacturing, CRM, and e-commerce
- Automated GST return filing, e-invoice IRN generation, and e-way bills
- Full offline invoice posting or multi-device offline conflict resolution
- Native mobile apps; V1 uses a responsive PWA
- Custom workflow builder, public API, webhooks, and custom roles except where enabled in Pro after stabilization
- AI-generated final posting, automatic price changes, or autonomous customer messaging

## Offline assumption

The PWA may cache the application shell and allow a recoverable local cart draft. Final invoice numbers and stock/payment posting require the server in V1. A local-server deployment may be evaluated for businesses with consistently poor connectivity.

## Release acceptance criteria

- All included workflows pass role, branch, and tenant-isolation tests
- Invoice totals match approved tax and rounding test vectors
- Posted invoices cannot be silently edited or deleted
- Every stock-affecting transaction creates balanced, idempotent stock movements
- Backup restore is rehearsed successfully
- Pilot data can be exported by an organization owner
- Core POS remains fully functional when the AI subscription is absent, exhausted, or unavailable
