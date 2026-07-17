# Webillify Web App

Angular 22 standalone PWA for the Webillify billing, POS, inventory and retail-operations product.

## Current slice

- Responsive application shell and branch navigation
- Demo sign-in experience
- Dashboard with operational summaries
- Interactive POS catalogue, cart and mock payment completion
- Product catalogue and stock status table
- Typed domain models, repository contracts and explicit mock/API data modes
- Shared loading, empty and error request-state model
- Installable production PWA/service worker
- Placeholder routes for customers, purchases, reports and settings

All displayed business data is local sample data. There is no backend persistence yet, and the UI identifies demo-only transaction behavior.

## Commands

```bash
npm start
npm test -- --watch=false
npm run build
```

The development server runs at `http://localhost:4200`. Production output is written under `dist/webillify-web-app/`.

## Architecture direction

Routes are lazy-loaded standalone components. Pages depend on typed repository contracts rather than demo data files. The current environment selects mock repositories; selecting API mode returns an explicit not-implemented error until the NestJS adapters are built, so production wiring cannot silently fall back to sample data.

## Development tracking

Project goals, timestamped session history, completed/pending modules, risks, decisions and the assignable next-task queue are maintained in [logfiles/README.md](logfiles/README.md).
