# Webillify Web App

Angular 22 standalone PWA for the Webillify billing, POS, inventory and retail-operations product.

## Current slice

- Responsive application shell and branch navigation
- Real API sign-in, persisted access token, refresh cookie and tenant context
- Live dashboard with catalogue, stock, purchase and payable summaries
- Real product catalogue and branch stock status in Products and POS
- Purchase draft creation, posting and supplier-payment actions
- Core Business plan and separately billed Webillify AI lifecycle/credit status
- Typed domain models, repository contracts and explicit test mock/API modes
- Shared loading, empty and error request-state model
- Installable production PWA/service worker
- Placeholder routes for customers and reports

Development and production builds use the API adapters. Real POS sales posting is explicitly unavailable until BE-008; the UI does not pretend that a sale was persisted.

## Commands

```bash
npm start
npm test -- --watch=false
npm run build
```

The development server runs at `http://localhost:4200` and proxies `/api` to `http://localhost:3000`. Production output is written under `dist/webillify-web-app/`.

## Architecture direction

Routes are lazy-loaded standalone components. Pages depend on typed repository contracts rather than direct data files. Connected environments select API repositories, while isolated unit tests may explicitly provide mock repositories.

## Development tracking

Project goals, timestamped session history, completed/pending modules, risks, decisions and the assignable next-task queue are maintained in [logfiles/README.md](logfiles/README.md).
