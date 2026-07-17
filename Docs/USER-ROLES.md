# User roles and access

Permissions are deny-by-default and scoped to an organization plus the branches assigned to the user. Platform staff do not receive normal access to tenant business data.

| Role | Primary access | Restrictions |
| --- | --- | --- |
| Platform Super Admin | Plans, tenant lifecycle, platform health | No routine invoice/stock access; audited break-glass only |
| Support Agent | Tenant metadata and support diagnostics | No exports or financial edits; audited temporary access |
| Organization Owner | Companies, branches, users, subscription, all reports | Cannot alter immutable audit history |
| Branch Admin | Users and operations for assigned branches | No organization billing or other branches by default |
| Store Manager | Sales, returns, stock, purchases, closing, reports | Sensitive overrides require explicit permission |
| Cashier | POS, customers, receipts, own session | No costs, purchases, broad exports, or settings |
| Accountant | Purchases, expenses, taxes, receivables/payables, reports | No user/subscription administration |
| Inventory Staff | Products, counts, transfers, adjustments | No sale refunds or financial reports by default |
| Auditor | Read-only records, exports, and audit logs | No mutations |

## Sensitive permissions

The following are separate permissions, even if a role normally includes them:

- Discount above configured threshold
- Sale below minimum margin or price
- Void/cancel invoice
- Refund or return without original invoice
- Backdated transaction
- Stock adjustment and negative-stock override
- View product cost or margin
- Export customer or transaction data
- Modify tax profile, invoice series, or financial year
- Invite users, assign roles, or enable support access
- Purchase or change a subscription
- Use AI on tenant documents or business data

## Access rules

- One user identity may belong to multiple organizations, but each request operates within one explicit organization context.
- Branch-scoped users see only assigned branches unless granted cross-branch reporting.
- Organization owners can revoke sessions and require password reset.
- Support access is time-limited, purpose-bound, approved by the organization owner where practical, and fully audited.
- AI entitlements and AI permissions are both required: subscription alone does not grant every user access.
