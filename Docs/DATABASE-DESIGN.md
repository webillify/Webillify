# Database design

Status: Logical V1 schema. Exact columns and indexes are finalized with migrations during implementation.

## Conventions

- PostgreSQL with UUID primary keys and UTC `timestamptz` timestamps
- Tenant tables carry non-null `organization_id`; company/branch ownership is validated with composite foreign keys where practical
- Monetary amounts use `numeric`, quantities use `numeric`, and posted snapshots are immutable
- All mutable rows have `created_at`, `updated_at`, and actor metadata where relevant
- Soft deletion is allowed only for master data; posted transactional rows are cancelled/reversed, never deleted
- Unique constraints include tenant scope and normalized business keys

## Identity and tenancy

- `users`: global identity, verified contacts, password hash/status, last login
- `organizations`: tenant, locale, timezone, lifecycle status
- `organization_memberships`: user, organization, status
- `companies`: legal entity, tax profile, financial-year settings
- `branches`: operating location and company
- `roles`, `permissions`, `role_permissions`, `membership_roles`: RBAC
- `user_branch_access`: permitted branches
- `login_sessions`, `refresh_tokens`: revocable sessions using hashed token identifiers

## Subscription and usage

- `plans`, `plan_versions`, `plan_entitlements`: versioned core offers
- `subscriptions`: organization, plan version, state, billing boundary, gateway references
- `usage_counters`: invoice/user/branch metrics by billing period
- `ai_subscriptions`: independent AI lifecycle and included credits
- `ai_credit_ledger`: grant, consume, refund, expire, and purchased-pack entries
- `billing_events`: idempotent payment-gateway event processing

## Catalogue and parties

- `categories`, `units`, `tax_rates`
- `products`, `product_variants`, `product_barcodes`
- `product_serials`: optional serial status and transaction references
- `customers`, `suppliers`, `party_addresses`
- Master codes/barcodes are unique within the correct organization/company scope

## Sales and receivables

- `sales_invoices`: series/number, status, customer, place of supply, totals, tax snapshot, round-off
- `sales_invoice_items`: product snapshot, HSN/SAC, quantity, unit price, discount, taxable value, tax components, cost snapshot
- `sales_returns`, `sales_return_items`: original invoice links and refund/credit treatment
- `payments`: receipt/payment/refund, method, reference, amount, status
- `payment_allocations`: payment to invoice/bill allocation
- `pos_sessions`, `cash_movements`: opening, pay-in/out, expected/declared closing, variance

## Purchases, expenses, and payables

- `purchase_bills`, `purchase_bill_items`: supplier reference, tax snapshot, eligibility, totals
- `purchase_returns`, `purchase_return_items`
- `expense_categories`, `expenses`

## Inventory

- `warehouses`: belongs to branch; saleable/non-saleable flag
- `stock_movements`: immutable quantity and cost ledger with source/idempotency reference
- `stock_balances`: rebuildable per warehouse/variant projection
- `stock_transfers`, `stock_transfer_items`: dispatch, transit, receipt, difference
- `stock_counts`, `stock_count_items`: expected/count/difference and approval

## Platform records

- `attachments`: object key, content hash, MIME type, size, scan status, owner record
- `notifications`: channel, template, recipient, state, provider reference
- `audit_logs`: tenant, actor, action, target, correlation ID, IP/device metadata, before/after summary
- `idempotency_keys`: tenant/user/route/key, request hash, response reference, expiry
- `outbox_events`: reliable background job/event handoff
- `ai_runs`: capability, user, model/provider, source references, result state, credits, review outcome

## Critical constraints

- Invoice number unique on `(organization_id, company_id, document_type, financial_year, series, number)`.
- Supplier invoice reference unique/warned on normalized `(organization_id, company_id, supplier_id, reference)`.
- Stock movement source/idempotency unique to prevent double posting.
- Payment allocation total cannot exceed available payment or eligible document balance.
- Return quantity cannot exceed original quantity minus prior posted returns.
- Every cross-table relationship includes matching organization ownership; a raw UUID alone is not trusted.

## Transaction boundaries

Posting an invoice/bill/return performs sequence allocation, header/items, payment/allocation, stock movements, balances, usage counter, audit log, and outbox event in one database transaction. External PDF, messaging, and AI work occurs asynchronously after commit.

## Indexing and lifecycle

Index tenant plus common filters such as branch, status, occurred date, party, product, invoice number, and barcode. Partition high-volume audit/stock tables only after measured need. Backups, retention, archival, and deletion jobs must preserve financial/audit obligations and tenant export rights.
