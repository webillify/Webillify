-- Prevent duplicate grants, purchases, consumption charges, and refunds for one
-- organization/source reference while still allowing unrelated ledger entries.
CREATE UNIQUE INDEX "ai_credit_ledger_organization_id_entry_type_reference_type__key"
ON "ai_credit_ledger"("organization_id", "entry_type", "reference_type", "reference_id");
