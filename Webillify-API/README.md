# Webillify API

NestJS 11 modular-monolith API for Webillify billing, inventory, subscriptions, and the separately entitled Webillify AI add-on.

## Requirements

- Node.js 22+
- npm 10+

Copy `.env.example` to `.env` for local overrides. Never commit `.env` files.

## Commands

```bash
npm ci
npm run start:dev
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

## Current endpoints

- `GET /api/v1` — versioned service metadata
- `GET /api/v1/health` — process liveness
- `GET /api/v1/health/ready` — dependency readiness (database checks are added with BE-002)
- `/api/docs` — Swagger UI
- `/api/docs/openapi.json` — generated OpenAPI document
- `/api/v1/auth/*`, `/api/v1/me` — login, rotating refresh, logout and identity context
- `/api/v1/organizations`, `/api/v1/branches`, `/api/v1/roles`, `/api/v1/permissions`
- `/api/v1/plans`, `/api/v1/subscription`, `/api/v1/usage`, `/api/v1/ai/plan`, `/api/v1/ai/usage`
- `/api/v1/products`, reference data, stock balances, movements and adjustments
- `/api/v1/suppliers`, `/api/v1/purchase-bills`, posting and `/api/v1/supplier-payments`

Every response returns `X-Correlation-Id`. Errors use the stable envelope documented in `../Docs/API-SPEC.md`. Request DTOs are transformed, whitelisted, and reject unknown fields. Implemented mutations enforce tenancy, permissions, active core entitlement, idempotency and atomic transaction boundaries.
