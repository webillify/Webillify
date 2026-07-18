-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN     "refunded_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "returned_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "sales_invoice_id" UUID NOT NULL,
    "customer_id" UUID,
    "return_date" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "taxable_value" DECIMAL(14,2) NOT NULL,
    "cgst_amount" DECIMAL(14,2) NOT NULL,
    "sgst_amount" DECIMAL(14,2) NOT NULL,
    "igst_amount" DECIMAL(14,2) NOT NULL,
    "cess_amount" DECIMAL(14,2) NOT NULL,
    "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "applied_to_receivable_amount" DECIMAL(14,2) NOT NULL,
    "refund_amount" DECIMAL(14,2) NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "posted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sales_return_id" UUID NOT NULL,
    "sales_invoice_item_id" UUID NOT NULL,
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

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_refunds" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "pos_session_id" UUID NOT NULL,
    "sales_invoice_id" UUID NOT NULL,
    "sales_return_id" UUID NOT NULL,
    "customer_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" VARCHAR(120),
    "idempotency_key" VARCHAR(120) NOT NULL,
    "refunded_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_returns_organization_id_sales_invoice_id_return_date_idx" ON "sales_returns"("organization_id", "sales_invoice_id", "return_date");

-- CreateIndex
CREATE INDEX "sales_returns_organization_id_customer_id_return_date_idx" ON "sales_returns"("organization_id", "customer_id", "return_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_id_organization_id_key" ON "sales_returns"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_organization_id_idempotency_key_key" ON "sales_returns"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "sales_return_items_organization_id_sales_invoice_item_id_idx" ON "sales_return_items"("organization_id", "sales_invoice_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_return_items_id_organization_id_key" ON "sales_return_items"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_return_items_organization_id_sales_return_id_sales_in_key" ON "sales_return_items"("organization_id", "sales_return_id", "sales_invoice_item_id");

-- CreateIndex
CREATE INDEX "sales_refunds_organization_id_sales_invoice_id_refunded_at_idx" ON "sales_refunds"("organization_id", "sales_invoice_id", "refunded_at");

-- CreateIndex
CREATE INDEX "sales_refunds_organization_id_pos_session_id_refunded_at_idx" ON "sales_refunds"("organization_id", "pos_session_id", "refunded_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_refunds_id_organization_id_key" ON "sales_refunds"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_refunds_sales_return_id_organization_id_key" ON "sales_refunds"("sales_return_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_refunds_organization_id_idempotency_key_key" ON "sales_refunds"("organization_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sales_invoice_id_organization_id_fkey" FOREIGN KEY ("sales_invoice_id", "organization_id") REFERENCES "sales_invoices"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_return_id_organization_id_fkey" FOREIGN KEY ("sales_return_id", "organization_id") REFERENCES "sales_returns"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_invoice_item_id_organization_id_fkey" FOREIGN KEY ("sales_invoice_item_id", "organization_id") REFERENCES "sales_invoice_items"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_pos_session_id_organization_id_fkey" FOREIGN KEY ("pos_session_id", "organization_id") REFERENCES "pos_sessions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_sales_invoice_id_organization_id_fkey" FOREIGN KEY ("sales_invoice_id", "organization_id") REFERENCES "sales_invoices"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_sales_return_id_organization_id_fkey" FOREIGN KEY ("sales_return_id", "organization_id") REFERENCES "sales_returns"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reconcile invoice projections against the append-only compensation ledgers.
ALTER TABLE "sales_invoices" DROP CONSTRAINT "sales_invoices_amounts_check";
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_amounts_check" CHECK (
  "invoice_number" > 0 AND "gross_amount" >= 0 AND "discount_amount" >= 0 AND
  "discount_amount" <= "gross_amount" AND "taxable_value" >= 0 AND
  "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
  "cess_amount" >= 0 AND "round_off" BETWEEN -0.99 AND 0.99 AND
  "total_amount" > 0 AND "paid_amount" >= 0 AND "paid_amount" <= "total_amount" AND
  "returned_amount" >= 0 AND "returned_amount" <= "total_amount" AND
  "refunded_amount" >= 0 AND "refunded_amount" <= "paid_amount" AND
  "outstanding_amount" = CASE WHEN "status" = 'CANCELLED' THEN 0
    ELSE GREATEST("total_amount" - "paid_amount" - "returned_amount", 0) END AND
  ("status" <> 'CANCELLED' OR "returned_amount" = "total_amount") AND
  "cost_amount" >= 0 AND
  "total_amount" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount" + "round_off"
);

ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_amounts_check" CHECK (
  char_length("reason") BETWEEN 5 AND 500 AND "taxable_value" >= 0 AND
  "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
  "cess_amount" >= 0 AND "round_off" BETWEEN -0.99 AND 0.99 AND "total_amount" > 0 AND
  "total_amount" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount" + "round_off" AND
  "applied_to_receivable_amount" >= 0 AND "refund_amount" >= 0 AND
  "applied_to_receivable_amount" + "refund_amount" = "total_amount"
);
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_amounts_check" CHECK (
  "quantity" > 0 AND "unit_cost" >= 0 AND "taxable_value" >= 0 AND
  "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
  "cess_amount" >= 0 AND "line_total" > 0 AND
  "line_total" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount"
);
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_amount_check" CHECK ("amount" > 0);

CREATE FUNCTION validate_sales_return() RETURNS trigger AS $$
DECLARE
  invoice_record "sales_invoices"%ROWTYPE;
  prior_total DECIMAL(14,2);
BEGIN
  SELECT * INTO invoice_record FROM "sales_invoices"
  WHERE "id" = NEW."sales_invoice_id" AND "organization_id" = NEW."organization_id" FOR UPDATE;
  SELECT COALESCE(SUM("total_amount"), 0) INTO prior_total FROM "sales_returns"
  WHERE "organization_id" = NEW."organization_id" AND "sales_invoice_id" = NEW."sales_invoice_id";
  IF invoice_record."status" <> 'POSTED' OR invoice_record."company_id" <> NEW."company_id"
    OR invoice_record."branch_id" <> NEW."branch_id" OR invoice_record."warehouse_id" <> NEW."warehouse_id"
    OR invoice_record."customer_id" IS DISTINCT FROM NEW."customer_id"
    OR prior_total + NEW."total_amount" > invoice_record."total_amount" THEN
    RAISE EXCEPTION 'sales return ownership or amount is invalid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_returns_validate BEFORE INSERT ON "sales_returns"
FOR EACH ROW EXECUTE FUNCTION validate_sales_return();

CREATE FUNCTION validate_sales_return_item() RETURNS trigger AS $$
DECLARE
  return_record "sales_returns"%ROWTYPE;
  invoice_item_record "sales_invoice_items"%ROWTYPE;
  prior_quantity DECIMAL(18,3);
BEGIN
  SELECT * INTO return_record FROM "sales_returns"
  WHERE "id" = NEW."sales_return_id" AND "organization_id" = NEW."organization_id";
  SELECT * INTO invoice_item_record FROM "sales_invoice_items"
  WHERE "id" = NEW."sales_invoice_item_id" AND "organization_id" = NEW."organization_id";
  SELECT COALESCE(SUM("quantity"), 0) INTO prior_quantity FROM "sales_return_items"
  WHERE "organization_id" = NEW."organization_id" AND "sales_invoice_item_id" = NEW."sales_invoice_item_id";
  IF return_record."sales_invoice_id" <> invoice_item_record."sales_invoice_id"
    OR invoice_item_record."variant_id" <> NEW."variant_id"
    OR prior_quantity + NEW."quantity" > invoice_item_record."quantity" THEN
    RAISE EXCEPTION 'sales return item ownership or quantity is invalid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_return_items_validate BEFORE INSERT ON "sales_return_items"
FOR EACH ROW EXECUTE FUNCTION validate_sales_return_item();

CREATE FUNCTION validate_sales_refund() RETURNS trigger AS $$
DECLARE
  return_record "sales_returns"%ROWTYPE;
  session_record "pos_sessions"%ROWTYPE;
BEGIN
  SELECT * INTO return_record FROM "sales_returns"
  WHERE "id" = NEW."sales_return_id" AND "organization_id" = NEW."organization_id";
  SELECT * INTO session_record FROM "pos_sessions"
  WHERE "id" = NEW."pos_session_id" AND "organization_id" = NEW."organization_id" FOR UPDATE;
  IF session_record."status" <> 'OPEN' OR return_record."sales_invoice_id" <> NEW."sales_invoice_id"
    OR return_record."customer_id" IS DISTINCT FROM NEW."customer_id"
    OR return_record."company_id" <> NEW."company_id" OR return_record."branch_id" <> NEW."branch_id"
    OR session_record."company_id" <> NEW."company_id" OR session_record."branch_id" <> NEW."branch_id"
    OR return_record."refund_amount" <> NEW."amount" THEN
    RAISE EXCEPTION 'sales refund ownership or amount is invalid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_refunds_validate BEFORE INSERT ON "sales_refunds"
FOR EACH ROW EXECUTE FUNCTION validate_sales_refund();

DROP TRIGGER "sales_invoices_immutable" ON "sales_invoices";
DROP FUNCTION "prevent_sales_invoice_mutation"();
CREATE FUNCTION prevent_sales_invoice_mutation() RETURNS trigger AS $$
DECLARE
  paid DECIMAL(14,2);
  returned DECIMAL(14,2);
  refunded DECIMAL(14,2);
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'posted sales invoices are immutable'; END IF;
  IF ROW(
    NEW."id", NEW."organization_id", NEW."company_id", NEW."branch_id", NEW."warehouse_id",
    NEW."pos_session_id", NEW."invoice_series_id", NEW."customer_id", NEW."financial_year",
    NEW."series_prefix", NEW."invoice_number", NEW."display_number", NEW."invoice_date",
    NEW."tax_treatment", NEW."place_of_supply_state_code", NEW."currency", NEW."gross_amount",
    NEW."discount_amount", NEW."taxable_value", NEW."cgst_amount", NEW."sgst_amount",
    NEW."igst_amount", NEW."cess_amount", NEW."round_off", NEW."total_amount", NEW."cost_amount",
    NEW."idempotency_key", NEW."request_hash", NEW."posted_at", NEW."posted_by_user_id", NEW."created_at"
  ) IS DISTINCT FROM ROW(
    OLD."id", OLD."organization_id", OLD."company_id", OLD."branch_id", OLD."warehouse_id",
    OLD."pos_session_id", OLD."invoice_series_id", OLD."customer_id", OLD."financial_year",
    OLD."series_prefix", OLD."invoice_number", OLD."display_number", OLD."invoice_date",
    OLD."tax_treatment", OLD."place_of_supply_state_code", OLD."currency", OLD."gross_amount",
    OLD."discount_amount", OLD."taxable_value", OLD."cgst_amount", OLD."sgst_amount",
    OLD."igst_amount", OLD."cess_amount", OLD."round_off", OLD."total_amount", OLD."cost_amount",
    OLD."idempotency_key", OLD."request_hash", OLD."posted_at", OLD."posted_by_user_id", OLD."created_at"
  ) OR OLD."status" = 'CANCELLED' OR (NEW."status" <> OLD."status" AND NEW."status" <> 'CANCELLED') THEN
    RAISE EXCEPTION 'posted sales invoices are immutable';
  END IF;
  SELECT COALESCE(SUM("amount"), 0) INTO paid FROM "sales_payments"
    WHERE "organization_id" = NEW."organization_id" AND "sales_invoice_id" = NEW."id";
  SELECT COALESCE(SUM("total_amount"), 0), COALESCE(SUM("refund_amount"), 0)
    INTO returned, refunded FROM "sales_returns"
    WHERE "organization_id" = NEW."organization_id" AND "sales_invoice_id" = NEW."id";
  IF NEW."paid_amount" <> paid OR NEW."returned_amount" <> returned OR NEW."refunded_amount" <> refunded
    OR NEW."outstanding_amount" <> (CASE WHEN NEW."status" = 'CANCELLED' THEN 0 ELSE GREATEST(NEW."total_amount" - paid - returned, 0) END) THEN
    RAISE EXCEPTION 'sales invoice payment and return projections must reconcile';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_invoices_immutable BEFORE UPDATE OR DELETE ON "sales_invoices"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_invoice_mutation();

CREATE TRIGGER sales_returns_immutable BEFORE UPDATE OR DELETE ON "sales_returns"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_financial_mutation();
CREATE TRIGGER sales_return_items_immutable BEFORE UPDATE OR DELETE ON "sales_return_items"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_financial_mutation();
CREATE TRIGGER sales_refunds_immutable BEFORE UPDATE OR DELETE ON "sales_refunds"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_financial_mutation();
