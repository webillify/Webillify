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

Every response returns `X-Correlation-Id`. Errors use the stable envelope documented in `../Docs/API-SPEC.md`. Request DTOs are transformed, whitelisted, and reject unknown fields. Production identity, tenancy, persistence, and transaction modules remain release-gated work.
