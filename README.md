# Webillify

Webillify is a multi-company, multi-branch billing, POS, inventory, and business-operations platform for Indian small and medium retail businesses.

## V1 focus

The first release targets home-appliance retailers and grocery/organic stores. It covers GST-ready billing, purchases, stock, customers, suppliers, expenses, cash closing, and essential reports. It is not intended to replace a full ERP or general-ledger accounting package in V1.

## Subscription model

Core product access is sold through Starter, Business, and Pro plans. **Webillify AI is a separate optional subscription** and is never required for normal billing or POS operation.

See [Docs/README.md](Docs/README.md) for the product and engineering documentation index.

## Status

This repository currently contains the V1 product specification. Application code has not yet been scaffolded.

## Important validation gates

- Accounting rules must be reviewed by a qualified accountant or Tally/GST practitioner.
- GST invoice and tax workflows must be reviewed before claiming compliance.
- Pricing and AI usage limits are launch assumptions and must be tested during the pilot.
- Production use requires security, backup-restore, tenant-isolation, and invoice-integrity testing.
