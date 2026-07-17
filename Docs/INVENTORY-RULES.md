# Inventory rules

Status: Committed for V1.

## Source of truth

`stock_movements` is the immutable ledger. `stock_balances` is a transactional projection used for fast reads and must be rebuildable from posted movements.

Every movement contains organization, company, branch, warehouse, product variant, quantity, unit cost, movement type, occurred time, source document type/id, actor, and idempotency key.

## Movement types

- Opening stock
- Purchase receipt and purchase return
- Sale issue and sales return
- Transfer dispatch, transfer receipt, and transfer difference
- Positive/negative adjustment
- Damage, expiry, or scrap
- Cancellation/reversal

Posted source documents generate movements atomically. Users cannot insert normal stock movements independently of an approved source workflow.

## Quantity rules

- Stock is maintained in the product's base unit.
- Alternate-unit conversion is Later unless a fixed conversion is configured before any transaction.
- Serial-tracked products require unique serials for relevant receipt and sale quantities.
- Batch/expiry tracking is a post-pilot candidate for grocery operations.
- Negative stock is blocked by default. An explicit organization policy plus manager permission may allow it, and every override is audited.

## Transfers

- Dispatch reduces source on-hand and increases in-transit quantity.
- Receipt reduces in-transit and increases destination on-hand.
- Partial receipts and differences remain open until resolved with an approved adjustment.
- A transfer never changes organization ownership in V1.

## Counts and adjustments

- A stock count records expected and counted quantities without rewriting history.
- Approval creates the difference movement with a mandatory reason.
- Large differences use a configurable approval threshold.
- Backdated movements trigger recalculation of affected weighted-average valuation and are restricted after period lock.

## Concurrency and idempotency

- Stock validation and invoice posting occur in one database transaction.
- Relevant balance rows are locked or updated conditionally to prevent overselling races.
- Repeating a request with the same idempotency key returns the prior result and creates no additional movement.
- Projection drift is monitored by a scheduled reconciliation against the movement ledger.

## Valuation

V1 uses moving weighted-average cost per variant and warehouse. Zero or negative quantities, returns, free items, landed charges, and cancellation cases require deterministic test fixtures before release.
