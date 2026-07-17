CREATE OR REPLACE FUNCTION validate_supplier_payment_allocation() RETURNS trigger AS $$
DECLARE
  bill_record "purchase_bills"%ROWTYPE;
  payment_record "supplier_payments"%ROWTYPE;
  payment_allocated DECIMAL(14,2);
  bill_allocated DECIMAL(14,2);
BEGIN
  SELECT * INTO payment_record FROM "supplier_payments"
  WHERE "id" = NEW."payment_id" AND "organization_id" = NEW."organization_id"
  FOR UPDATE;
  SELECT * INTO bill_record FROM "purchase_bills"
  WHERE "id" = NEW."purchase_bill_id" AND "organization_id" = NEW."organization_id"
  FOR UPDATE;

  IF payment_record."status" <> 'POSTED' OR bill_record."status" <> 'POSTED' THEN
    RAISE EXCEPTION 'payments may only allocate to posted purchase bills';
  END IF;
  IF payment_record."supplier_id" <> bill_record."supplier_id"
    OR payment_record."company_id" <> bill_record."company_id"
    OR payment_record."branch_id" <> bill_record."branch_id" THEN
    RAISE EXCEPTION 'payment and purchase bill ownership must match';
  END IF;

  SELECT COALESCE(SUM("amount"), 0) INTO payment_allocated
  FROM "supplier_payment_allocations"
  WHERE "organization_id" = NEW."organization_id" AND "payment_id" = NEW."payment_id";
  SELECT COALESCE(SUM("amount"), 0) INTO bill_allocated
  FROM "supplier_payment_allocations"
  WHERE "organization_id" = NEW."organization_id" AND "purchase_bill_id" = NEW."purchase_bill_id";

  IF payment_allocated + NEW."amount" > payment_record."amount" THEN
    RAISE EXCEPTION 'payment allocations exceed payment amount';
  END IF;
  IF bill_allocated + NEW."amount" > bill_record."total_amount" THEN
    RAISE EXCEPTION 'payment allocations exceed purchase bill total';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_payment_allocations_validate
BEFORE INSERT ON "supplier_payment_allocations"
FOR EACH ROW EXECUTE FUNCTION validate_supplier_payment_allocation();

CREATE OR REPLACE FUNCTION prevent_posted_purchase_bill_mutation() RETURNS trigger AS $$
DECLARE
  allocated DECIMAL(14,2);
BEGIN
  IF OLD.status = 'POSTED' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'posted purchase bills are immutable';
    END IF;
    IF ROW(
      NEW."id", NEW."organization_id", NEW."company_id", NEW."branch_id", NEW."warehouse_id",
      NEW."supplier_id", NEW."status", NEW."supplier_invoice_reference", NEW."normalized_reference",
      NEW."invoice_date", NEW."due_date", NEW."currency", NEW."taxable_value", NEW."cgst_amount",
      NEW."sgst_amount", NEW."igst_amount", NEW."cess_amount", NEW."round_off", NEW."total_amount",
      NEW."input_tax_eligible", NEW."posting_idempotency_key", NEW."posted_at", NEW."posted_by_user_id",
      NEW."created_at"
    ) IS DISTINCT FROM ROW(
      OLD."id", OLD."organization_id", OLD."company_id", OLD."branch_id", OLD."warehouse_id",
      OLD."supplier_id", OLD."status", OLD."supplier_invoice_reference", OLD."normalized_reference",
      OLD."invoice_date", OLD."due_date", OLD."currency", OLD."taxable_value", OLD."cgst_amount",
      OLD."sgst_amount", OLD."igst_amount", OLD."cess_amount", OLD."round_off", OLD."total_amount",
      OLD."input_tax_eligible", OLD."posting_idempotency_key", OLD."posted_at", OLD."posted_by_user_id",
      OLD."created_at"
    ) THEN
      RAISE EXCEPTION 'posted purchase bills are immutable';
    END IF;
    IF NEW."paid_amount" < OLD."paid_amount" THEN
      RAISE EXCEPTION 'posted purchase bill payment projection cannot decrease';
    END IF;
    SELECT COALESCE(SUM(allocation."amount"), 0) INTO allocated
    FROM "supplier_payment_allocations" allocation
    JOIN "supplier_payments" payment
      ON payment."id" = allocation."payment_id" AND payment."organization_id" = allocation."organization_id"
    WHERE allocation."organization_id" = NEW."organization_id"
      AND allocation."purchase_bill_id" = NEW."id" AND payment."status" = 'POSTED';
    IF NEW."paid_amount" <> allocated OR NEW."outstanding_amount" <> NEW."total_amount" - allocated THEN
      RAISE EXCEPTION 'purchase bill payment projection must reconcile to posted allocations';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
