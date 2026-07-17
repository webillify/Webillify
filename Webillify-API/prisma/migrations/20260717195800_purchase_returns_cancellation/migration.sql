ALTER TABLE "purchase_bills"
  ADD COLUMN "returned_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cancellation_idempotency_key" VARCHAR(120),
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancelled_by_user_id" UUID,
  ADD COLUMN "cancellation_reason" VARCHAR(500);

ALTER TABLE "purchase_bills" DROP CONSTRAINT "purchase_bills_amounts_check";
ALTER TABLE "purchase_bills" DROP CONSTRAINT "purchase_bills_posting_state_check";
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_amounts_check" CHECK (
  "taxable_value" >= 0 AND "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND
  "igst_amount" >= 0 AND "cess_amount" >= 0 AND "round_off" BETWEEN -0.99 AND 0.99 AND
  "total_amount" >= 0 AND "paid_amount" >= 0 AND "returned_amount" >= 0 AND
  "paid_amount" <= "total_amount" AND "returned_amount" <= "total_amount" AND
  "outstanding_amount" >= 0 AND
  "outstanding_amount" = CASE
    WHEN "status" = 'CANCELLED' THEN 0
    ELSE GREATEST("total_amount" - "paid_amount" - "returned_amount", 0)
  END
);
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_posting_state_check" CHECK (
  (
    "status" IN ('POSTED', 'CANCELLED') AND "posted_at" IS NOT NULL AND
    "posted_by_user_id" IS NOT NULL AND "posting_idempotency_key" IS NOT NULL
  ) OR "status" = 'DRAFT'
);
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_cancellation_state_check" CHECK (
  (
    "status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND
    "cancelled_by_user_id" IS NOT NULL AND "cancellation_idempotency_key" IS NOT NULL AND
    char_length("cancellation_reason") BETWEEN 5 AND 500
  ) OR (
    "status" <> 'CANCELLED' AND "cancelled_at" IS NULL AND
    "cancelled_by_user_id" IS NULL AND "cancellation_idempotency_key" IS NULL AND
    "cancellation_reason" IS NULL
  )
);

CREATE UNIQUE INDEX "purchase_bills_organization_id_cancellation_idempotency_key_key"
  ON "purchase_bills"("organization_id", "cancellation_idempotency_key");
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_cancelled_by_user_id_fkey"
  FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "purchase_returns" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_bill_id" UUID NOT NULL,
  "return_date" DATE NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "taxable_value" DECIMAL(14,2) NOT NULL,
  "cgst_amount" DECIMAL(14,2) NOT NULL,
  "sgst_amount" DECIMAL(14,2) NOT NULL,
  "igst_amount" DECIMAL(14,2) NOT NULL,
  "cess_amount" DECIMAL(14,2) NOT NULL,
  "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL,
  "applied_to_payable_amount" DECIMAL(14,2) NOT NULL,
  "supplier_credit_amount" DECIMAL(14,2) NOT NULL,
  "idempotency_key" VARCHAR(120) NOT NULL,
  "posted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "posted_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_returns_reason_check" CHECK (char_length("reason") BETWEEN 5 AND 500),
  CONSTRAINT "purchase_returns_amounts_check" CHECK (
    "taxable_value" >= 0 AND "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND
    "igst_amount" >= 0 AND "cess_amount" >= 0 AND "round_off" BETWEEN -0.99 AND 0.99 AND
    "total_amount" > 0 AND "applied_to_payable_amount" >= 0 AND "supplier_credit_amount" >= 0 AND
    "total_amount" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount" + "round_off" AND
    "total_amount" = "applied_to_payable_amount" + "supplier_credit_amount"
  )
);

CREATE TABLE "purchase_return_items" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "purchase_return_id" UUID NOT NULL,
  "purchase_bill_item_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unit_cost" DECIMAL(14,4) NOT NULL,
  "taxable_value" DECIMAL(14,2) NOT NULL,
  "cgst_amount" DECIMAL(14,2) NOT NULL,
  "sgst_amount" DECIMAL(14,2) NOT NULL,
  "igst_amount" DECIMAL(14,2) NOT NULL,
  "cess_amount" DECIMAL(14,2) NOT NULL,
  "line_total" DECIMAL(14,2) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_return_items_amounts_check" CHECK (
    "quantity" > 0 AND "unit_cost" >= 0 AND "taxable_value" >= 0 AND
    "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
    "cess_amount" >= 0 AND "line_total" > 0 AND
    "line_total" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount"
  )
);

CREATE UNIQUE INDEX "purchase_returns_id_organization_id_key" ON "purchase_returns"("id", "organization_id");
CREATE UNIQUE INDEX "purchase_returns_organization_id_idempotency_key_key" ON "purchase_returns"("organization_id", "idempotency_key");
CREATE INDEX "purchase_returns_organization_id_purchase_bill_id_return_date_idx" ON "purchase_returns"("organization_id", "purchase_bill_id", "return_date");
CREATE INDEX "purchase_returns_organization_id_supplier_id_return_date_idx" ON "purchase_returns"("organization_id", "supplier_id", "return_date");
CREATE UNIQUE INDEX "purchase_return_items_id_organization_id_key" ON "purchase_return_items"("id", "organization_id");
CREATE UNIQUE INDEX "purchase_return_items_organization_id_purchase_return_id_purchase_bill_item_id_key" ON "purchase_return_items"("organization_id", "purchase_return_id", "purchase_bill_item_id");
CREATE INDEX "purchase_return_items_organization_id_purchase_bill_item_id_idx" ON "purchase_return_items"("organization_id", "purchase_bill_item_id");

ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_organization_id_fkey" FOREIGN KEY ("supplier_id", "organization_id") REFERENCES "suppliers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_bill_id_organization_id_fkey" FOREIGN KEY ("purchase_bill_id", "organization_id") REFERENCES "purchase_bills"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_return_id_organization_id_fkey" FOREIGN KEY ("purchase_return_id", "organization_id") REFERENCES "purchase_returns"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_bill_item_id_organization_id_fkey" FOREIGN KEY ("purchase_bill_item_id", "organization_id") REFERENCES "purchase_bill_items"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_purchase_return_item() RETURNS trigger AS $$
DECLARE
  return_bill_id UUID;
  item_bill_id UUID;
  item_variant_id UUID;
  original_quantity DECIMAL(18,3);
  returned_quantity DECIMAL(18,3);
BEGIN
  SELECT "purchase_bill_id" INTO return_bill_id FROM "purchase_returns"
  WHERE "id" = NEW."purchase_return_id" AND "organization_id" = NEW."organization_id";
  SELECT "purchase_bill_id", "variant_id", "quantity" INTO item_bill_id, item_variant_id, original_quantity
  FROM "purchase_bill_items"
  WHERE "id" = NEW."purchase_bill_item_id" AND "organization_id" = NEW."organization_id";
  IF return_bill_id IS NULL OR item_bill_id IS NULL OR return_bill_id <> item_bill_id OR item_variant_id <> NEW."variant_id" THEN
    RAISE EXCEPTION 'purchase return item ownership must match its source bill item';
  END IF;
  SELECT COALESCE(SUM("quantity"), 0) INTO returned_quantity FROM "purchase_return_items"
  WHERE "organization_id" = NEW."organization_id" AND "purchase_bill_item_id" = NEW."purchase_bill_item_id";
  IF returned_quantity + NEW."quantity" > original_quantity THEN
    RAISE EXCEPTION 'purchase return quantity exceeds source bill quantity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_return_items_validate
BEFORE INSERT ON "purchase_return_items"
FOR EACH ROW EXECUTE FUNCTION validate_purchase_return_item();

CREATE FUNCTION prevent_purchase_return_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'purchase returns and their items are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_returns_immutable
BEFORE UPDATE OR DELETE ON "purchase_returns"
FOR EACH ROW EXECUTE FUNCTION prevent_purchase_return_mutation();
CREATE TRIGGER purchase_return_items_immutable
BEFORE UPDATE OR DELETE ON "purchase_return_items"
FOR EACH ROW EXECUTE FUNCTION prevent_purchase_return_mutation();

DROP TRIGGER "purchase_bills_posted_immutable" ON "purchase_bills";
CREATE OR REPLACE FUNCTION prevent_posted_purchase_bill_mutation() RETURNS trigger AS $$
DECLARE
  allocated DECIMAL(14,2);
  returned DECIMAL(14,2);
BEGIN
  IF OLD."status" IN ('POSTED', 'CANCELLED') THEN
    IF TG_OP = 'DELETE' OR OLD."status" = 'CANCELLED' THEN
      RAISE EXCEPTION 'posted purchase bills are immutable';
    END IF;
    IF NEW."status" NOT IN ('POSTED', 'CANCELLED') OR ROW(
      NEW."id", NEW."organization_id", NEW."company_id", NEW."branch_id", NEW."warehouse_id",
      NEW."supplier_id", NEW."supplier_invoice_reference", NEW."normalized_reference",
      NEW."invoice_date", NEW."due_date", NEW."currency", NEW."taxable_value", NEW."cgst_amount",
      NEW."sgst_amount", NEW."igst_amount", NEW."cess_amount", NEW."round_off", NEW."total_amount",
      NEW."input_tax_eligible", NEW."posting_idempotency_key", NEW."posted_at", NEW."posted_by_user_id",
      NEW."created_at"
    ) IS DISTINCT FROM ROW(
      OLD."id", OLD."organization_id", OLD."company_id", OLD."branch_id", OLD."warehouse_id",
      OLD."supplier_id", OLD."supplier_invoice_reference", OLD."normalized_reference",
      OLD."invoice_date", OLD."due_date", OLD."currency", OLD."taxable_value", OLD."cgst_amount",
      OLD."sgst_amount", OLD."igst_amount", OLD."cess_amount", OLD."round_off", OLD."total_amount",
      OLD."input_tax_eligible", OLD."posting_idempotency_key", OLD."posted_at", OLD."posted_by_user_id",
      OLD."created_at"
    ) THEN
      RAISE EXCEPTION 'posted purchase bills are immutable';
    END IF;
    SELECT COALESCE(SUM(allocation."amount"), 0) INTO allocated
    FROM "supplier_payment_allocations" allocation
    JOIN "supplier_payments" payment
      ON payment."id" = allocation."payment_id" AND payment."organization_id" = allocation."organization_id"
    WHERE allocation."organization_id" = NEW."organization_id"
      AND allocation."purchase_bill_id" = NEW."id" AND payment."status" = 'POSTED';
    SELECT COALESCE(SUM("total_amount"), 0) INTO returned
    FROM "purchase_returns"
    WHERE "organization_id" = NEW."organization_id" AND "purchase_bill_id" = NEW."id";
    IF NEW."paid_amount" <> allocated OR NEW."returned_amount" <> returned THEN
      RAISE EXCEPTION 'purchase bill payment and return projections must reconcile';
    END IF;
    IF NEW."status" = 'POSTED' THEN
      IF NEW."outstanding_amount" <> GREATEST(NEW."total_amount" - allocated - returned, 0)
        OR NEW."cancelled_at" IS NOT NULL OR NEW."cancelled_by_user_id" IS NOT NULL
        OR NEW."cancellation_idempotency_key" IS NOT NULL OR NEW."cancellation_reason" IS NOT NULL THEN
        RAISE EXCEPTION 'purchase bill payable projection must reconcile';
      END IF;
    ELSIF allocated <> 0 OR returned <> 0 OR NEW."outstanding_amount" <> 0
      OR NEW."cancelled_at" IS NULL OR NEW."cancelled_by_user_id" IS NULL
      OR NEW."cancellation_idempotency_key" IS NULL OR char_length(NEW."cancellation_reason") < 5 THEN
      RAISE EXCEPTION 'purchase bill cannot be cancelled with dependent effects';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_bills_posted_immutable
BEFORE UPDATE OR DELETE ON "purchase_bills"
FOR EACH ROW EXECUTE FUNCTION prevent_posted_purchase_bill_mutation();

CREATE OR REPLACE FUNCTION prevent_posted_purchase_item_mutation() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "purchase_bills"
    WHERE "id" = OLD."purchase_bill_id" AND "organization_id" = OLD."organization_id"
      AND "status" IN ('POSTED', 'CANCELLED')
  ) THEN
    RAISE EXCEPTION 'posted purchase bill items are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
