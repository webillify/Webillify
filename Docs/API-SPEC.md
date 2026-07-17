# API specification

Status: V1 contract outline. OpenAPI is generated during implementation and becomes the executable contract.

## Conventions

- Base path: `/api/v1`
- JSON over HTTPS; UTF-8; timestamps are ISO 8601 UTC
- UUID resource identifiers; money is serialized as decimal strings
- Access token is short-lived; refresh token is rotated and revocable
- `X-Organization-Id` selects an organization membership; branch scope is explicit in the resource or query
- `Idempotency-Key` is mandatory for posting invoices, bills, returns, payments, transfers, subscription changes, and credit-consuming AI requests
- List endpoints use cursor pagination and bounded `limit`
- `X-Correlation-Id` is returned for support and audit tracing

## Error format

```json
{
  "error": {
    "code": "STOCK_INSUFFICIENT",
    "message": "Available stock is lower than the requested quantity.",
    "fields": [{"path": "items[0].quantity", "code": "INSUFFICIENT"}],
    "correlationId": "uuid"
  }
}
```

Business errors use stable codes. Validation is `422`, unauthenticated `401`, forbidden/tenant mismatch `403` or non-revealing `404`, conflict `409`, rate limit `429`.

## Authentication

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /me`
- `GET /me/organizations`

## Organization and access

- `GET|POST /organizations`
- `GET|PATCH /organizations/{id}`
- `GET|POST /companies`
- `GET|POST /branches`
- `GET|POST /members`
- `PATCH /members/{id}/roles`
- `GET /roles`, `GET /permissions`
- `POST /support-access-grants`, `DELETE /support-access-grants/{id}`

## Catalogue and parties

- `GET|POST /products`, `GET|PATCH /products/{id}`
- `POST /products/imports`, `GET /products/imports/{id}`
- `GET|POST /categories`, `/units`, `/tax-rates`
- `GET|POST /customers`, `GET|PATCH /customers/{id}`
- `GET|POST /suppliers`, `GET|PATCH /suppliers/{id}`

## Sales and POS

- `POST /pos-sessions/open`, `POST /pos-sessions/{id}/close`
- `POST /pos-sessions/{id}/cash-movements`
- `POST /sales-invoices/drafts`
- `POST /sales-invoices/post`
- `GET /sales-invoices`, `GET /sales-invoices/{id}`
- `POST /sales-invoices/{id}/cancel`
- `POST /sales-returns`
- `POST /receipts`, `GET /customers/{id}/statement`
- `GET /sales-invoices/{id}/pdf`

Posting accepts the calculated draft plus client totals. The server recalculates and rejects mismatches; it alone allocates the final invoice number.

## Purchases, expenses, and inventory

- `GET|POST /purchase-bills`, `POST /purchase-bills/{id}/post`
- `POST /purchase-bills/{id}/cancel`, `POST /purchase-returns`
- `GET|POST /expenses`, `POST /supplier-payments`
- `GET /stock-balances`, `GET /stock-movements`
- `POST /stock-transfers`, `POST /stock-transfers/{id}/dispatch`, `POST /stock-transfers/{id}/receive`
- `POST /stock-counts`, `POST /stock-counts/{id}/approve`

## Reports and export

- `GET /reports/sales`, `/reports/taxes`, `/reports/payments`, `/reports/cash-closing`
- `GET /reports/stock`, `/reports/receivables`, `/reports/payables`
- `POST /exports`, `GET /exports/{id}`

Large exports are asynchronous, permission checked at request and download time, short-lived, and audited.

## Subscriptions

- `GET /plans`, `GET /subscription`, `POST /subscription/checkout`
- `POST /subscription/change`, `POST /subscription/cancel`
- `GET /usage`
- `POST /billing/webhooks/{provider}` with signature verification and idempotent processing

## Separate AI subscription

- `GET /ai/plan`, `GET /ai/usage`
- `POST /ai/subscription/checkout`, `POST /ai/subscription/cancel`
- `POST /ai/extractions/purchase-bill`
- `POST /ai/queries`
- `POST /ai/report-summaries`
- `POST /ai/reminder-drafts`
- `POST /ai/runs/{id}/review` records accepted/rejected/corrected outcome

AI endpoints require active core and AI subscriptions plus capability permission. Responses include model-independent result data, source references where applicable, credits charged, and warnings. No AI endpoint posts a financial transaction.

## Compatibility

Breaking changes require a new API version. Additive response fields may appear within V1; clients must ignore unknown fields. Deprecated fields receive a documented removal window.
