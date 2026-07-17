# Webillify

Webillify is a multi-company, multi-branch billing, POS, inventory, and business-operations platform for Indian small and medium retail businesses.

## V1 focus

The first release targets home-appliance retailers and grocery/organic stores. It covers GST-ready billing, purchases, stock, customers, suppliers, expenses, cash closing, and essential reports. It is not intended to replace a full ERP or general-ledger accounting package in V1.

## Subscription model

Core product access is sold through Starter, Business, and Pro plans. **Webillify AI is a separate optional subscription** and is never required for normal billing or POS operation.

See [Docs/README.md](Docs/README.md) for the product and engineering documentation index.

## Status

The repository now contains a browser-testable Angular 22 application, NestJS 11 API and PostgreSQL 17 database. The implemented connected surface includes real identity/session handling, tenant/branch authorization, versioned core subscriptions, a separately billed Webillify AI plan and credits, catalogue/stock, purchase drafts, atomic purchase posting and supplier payments.

Customers, real POS sales posting, purchase returns/cancellation, reports, production deployment and later AI capability workflows remain tracked work; placeholder or explicit unavailable states are used instead of silently faking those transactions.

## Test locally in a browser

Requirements: Node.js 22+, npm 10+ and Docker.

```bash
# Repository root: PostgreSQL
docker compose up -d postgres

# Terminal 1: API
cd Webillify-API
cp .env.example .env
npm ci
npm run db:deploy
npm run db:seed
npm run start:dev

# Terminal 2: Angular app (proxies /api to localhost:3000)
cd Webillify-Web-App
npm ci
npm start -- --host 0.0.0.0 --port 4200
```

Open `http://localhost:4200` and sign in with:

```text
Email: owner@webillify.demo
Password: webillify
```

API readiness is available at `http://localhost:3000/api/v1/health/ready` and Swagger at `http://localhost:3000/api/docs`.

## Important validation gates

- Accounting rules must be reviewed by a qualified accountant or Tally/GST practitioner.
- GST invoice and tax workflows must be reviewed before claiming compliance.
- Pricing and AI usage limits are launch assumptions and must be tested during the pilot.
- Production use requires security, backup-restore, tenant-isolation, and invoice-integrity testing.
