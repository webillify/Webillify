-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SALES_INVOICE');

-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('PAY_IN', 'PAY_OUT');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('INTRASTATE', 'INTERSTATE');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "normalized_code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "normalized_name" VARCHAR(180) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(320),
    "gstin" VARCHAR(15),
    "credit_days" SMALLINT NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "receivable_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_series" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "financial_year" VARCHAR(9) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "padding" SMALLINT NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invoice_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "opened_by_user_id" UUID NOT NULL,
    "closed_by_user_id" UUID,
    "register_code" VARCHAR(60) NOT NULL,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_cash" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cash_sales_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pay_in_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pay_out_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expected_cash" DECIMAL(14,2),
    "declared_cash" DECIMAL(14,2),
    "variance" DECIMAL(14,2),
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "pos_session_id" UUID NOT NULL,
    "invoice_series_id" UUID NOT NULL,
    "customer_id" UUID,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'POSTED',
    "financial_year" VARCHAR(9) NOT NULL,
    "series_prefix" VARCHAR(20) NOT NULL,
    "invoice_number" INTEGER NOT NULL,
    "display_number" VARCHAR(50) NOT NULL,
    "invoice_date" TIMESTAMPTZ(3) NOT NULL,
    "tax_treatment" "TaxTreatment" NOT NULL,
    "place_of_supply_state_code" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "gross_amount" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxable_value" DECIMAL(14,2) NOT NULL,
    "cgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cess_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cost_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "posted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_by_user_id" UUID NOT NULL,
    "cancellation_idempotency_key" VARCHAR(120),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancelled_by_user_id" UUID,
    "cancellation_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sales_invoice_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "hsn_sac" VARCHAR(12),
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "gross_amount" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxable_value" DECIMAL(14,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "cgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cess_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "cost_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "pos_session_id" UUID NOT NULL,
    "sales_invoice_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" VARCHAR(120),
    "received_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "pos_session_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "movement_type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_organization_id_normalized_name_active_idx" ON "customers"("organization_id", "normalized_name", "active");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_normalized_code_key" ON "customers"("organization_id", "normalized_code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_organization_id_key" ON "customers"("id", "organization_id");

-- CreateIndex
CREATE INDEX "invoice_series_organization_id_company_id_active_idx" ON "invoice_series"("organization_id", "company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_series_id_organization_id_key" ON "invoice_series"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_series_organization_id_company_id_document_type_fin_key" ON "invoice_series"("organization_id", "company_id", "document_type", "financial_year", "prefix");

-- CreateIndex
CREATE INDEX "pos_sessions_organization_id_branch_id_status_opened_at_idx" ON "pos_sessions"("organization_id", "branch_id", "status", "opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sessions_id_organization_id_key" ON "pos_sessions"("id", "organization_id");

-- CreateIndex
CREATE INDEX "sales_invoices_organization_id_branch_id_status_invoice_dat_idx" ON "sales_invoices"("organization_id", "branch_id", "status", "invoice_date");

-- CreateIndex
CREATE INDEX "sales_invoices_organization_id_customer_id_status_invoice_d_idx" ON "sales_invoices"("organization_id", "customer_id", "status", "invoice_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_id_organization_id_key" ON "sales_invoices"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_organization_id_idempotency_key_key" ON "sales_invoices"("organization_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_organization_id_company_id_financial_year_se_key" ON "sales_invoices"("organization_id", "company_id", "financial_year", "series_prefix", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_organization_id_company_id_display_number_key" ON "sales_invoices"("organization_id", "company_id", "display_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_organization_id_cancellation_idempotency_key_key" ON "sales_invoices"("organization_id", "cancellation_idempotency_key");

-- CreateIndex
CREATE INDEX "sales_invoice_items_organization_id_sales_invoice_id_idx" ON "sales_invoice_items"("organization_id", "sales_invoice_id");

-- CreateIndex
CREATE INDEX "sales_invoice_items_organization_id_variant_id_idx" ON "sales_invoice_items"("organization_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoice_items_id_organization_id_key" ON "sales_invoice_items"("id", "organization_id");

-- CreateIndex
CREATE INDEX "sales_payments_organization_id_sales_invoice_id_idx" ON "sales_payments"("organization_id", "sales_invoice_id");

-- CreateIndex
CREATE INDEX "sales_payments_organization_id_pos_session_id_received_at_idx" ON "sales_payments"("organization_id", "pos_session_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_payments_id_organization_id_key" ON "sales_payments"("id", "organization_id");

-- CreateIndex
CREATE INDEX "cash_movements_organization_id_pos_session_id_occurred_at_idx" ON "cash_movements"("organization_id", "pos_session_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_id_organization_id_key" ON "cash_movements"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_organization_id_idempotency_key_key" ON "cash_movements"("organization_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_pos_session_id_organization_id_fkey" FOREIGN KEY ("pos_session_id", "organization_id") REFERENCES "pos_sessions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_invoice_series_id_organization_id_fkey" FOREIGN KEY ("invoice_series_id", "organization_id") REFERENCES "invoice_series"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_sales_invoice_id_organization_id_fkey" FOREIGN KEY ("sales_invoice_id", "organization_id") REFERENCES "sales_invoices"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_pos_session_id_organization_id_fkey" FOREIGN KEY ("pos_session_id", "organization_id") REFERENCES "pos_sessions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_sales_invoice_id_organization_id_fkey" FOREIGN KEY ("sales_invoice_id", "organization_id") REFERENCES "sales_invoices"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_pos_session_id_organization_id_fkey" FOREIGN KEY ("pos_session_id", "organization_id") REFERENCES "pos_sessions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_financials_check" CHECK (
  "credit_days" BETWEEN 0 AND 3650 AND "credit_limit" >= 0 AND
  "receivable_balance" >= 0 AND "credit_balance" >= 0
);
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_values_check" CHECK (
  "next_number" > 0 AND "padding" BETWEEN 1 AND 12 AND
  "financial_year" ~ '^[0-9]{4}-[0-9]{2}$' AND char_length(trim("prefix")) > 0
);
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_amounts_check" CHECK (
  "opening_cash" >= 0 AND "cash_sales_amount" >= 0 AND "pay_in_amount" >= 0 AND
  "pay_out_amount" >= 0 AND "refund_amount" >= 0
);
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_state_check" CHECK (
  (
    "status" = 'OPEN' AND "closed_by_user_id" IS NULL AND "closed_at" IS NULL AND
    "expected_cash" IS NULL AND "declared_cash" IS NULL AND "variance" IS NULL
  ) OR (
    "status" = 'CLOSED' AND "closed_by_user_id" IS NOT NULL AND "closed_at" IS NOT NULL AND
    "expected_cash" IS NOT NULL AND "declared_cash" IS NOT NULL AND
    "variance" = "declared_cash" - "expected_cash"
  )
);
CREATE UNIQUE INDEX "pos_sessions_one_open_register_key"
  ON "pos_sessions"("organization_id", "branch_id", "register_code") WHERE "status" = 'OPEN';

ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_amounts_check" CHECK (
  "invoice_number" > 0 AND "gross_amount" >= 0 AND "discount_amount" >= 0 AND
  "discount_amount" <= "gross_amount" AND "taxable_value" >= 0 AND
  "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
  "cess_amount" >= 0 AND "round_off" BETWEEN -0.99 AND 0.99 AND
  "total_amount" > 0 AND "paid_amount" >= 0 AND "paid_amount" <= "total_amount" AND
  "outstanding_amount" = CASE WHEN "status" = 'CANCELLED' THEN 0 ELSE "total_amount" - "paid_amount" END AND
  "cost_amount" >= 0 AND
  "total_amount" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount" + "round_off"
);
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tax_check" CHECK (
  ("tax_treatment" = 'INTRASTATE' AND "igst_amount" = 0) OR
  ("tax_treatment" = 'INTERSTATE' AND "cgst_amount" = 0 AND "sgst_amount" = 0)
);
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cancellation_state_check" CHECK (
  (
    "status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND
    "cancelled_by_user_id" IS NOT NULL AND "cancellation_idempotency_key" IS NOT NULL AND
    char_length("cancellation_reason") BETWEEN 5 AND 500
  ) OR (
    "status" = 'POSTED' AND "cancelled_at" IS NULL AND "cancelled_by_user_id" IS NULL AND
    "cancellation_idempotency_key" IS NULL AND "cancellation_reason" IS NULL
  )
);
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_amounts_check" CHECK (
  "quantity" > 0 AND "unit_price" >= 0 AND "gross_amount" >= 0 AND
  "discount_amount" >= 0 AND "discount_amount" <= "gross_amount" AND
  "taxable_value" >= 0 AND "tax_rate" BETWEEN 0 AND 100 AND
  "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
  "cess_amount" >= 0 AND "line_total" > 0 AND "unit_cost" >= 0 AND "cost_amount" >= 0 AND
  "line_total" = "taxable_value" + "cgst_amount" + "sgst_amount" + "igst_amount" + "cess_amount"
);
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_amount_check" CHECK ("amount" > 0);
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_values_check" CHECK (
  "amount" > 0 AND char_length("reason") BETWEEN 5 AND 500
);

CREATE FUNCTION validate_pos_session_scope() RETURNS trigger AS $$
DECLARE
  branch_company UUID;
  warehouse_company UUID;
  warehouse_branch UUID;
BEGIN
  SELECT "company_id" INTO branch_company FROM "branches"
  WHERE "id" = NEW."branch_id" AND "organization_id" = NEW."organization_id";
  SELECT "company_id", "branch_id" INTO warehouse_company, warehouse_branch FROM "warehouses"
  WHERE "id" = NEW."warehouse_id" AND "organization_id" = NEW."organization_id";
  IF branch_company IS NULL OR warehouse_company IS NULL OR branch_company <> NEW."company_id"
    OR warehouse_company <> NEW."company_id" OR warehouse_branch <> NEW."branch_id" THEN
    RAISE EXCEPTION 'POS session company, branch and warehouse ownership must match';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pos_sessions_scope_validate
BEFORE INSERT OR UPDATE ON "pos_sessions"
FOR EACH ROW EXECUTE FUNCTION validate_pos_session_scope();

CREATE FUNCTION validate_sales_invoice_scope() RETURNS trigger AS $$
DECLARE
  session_record "pos_sessions"%ROWTYPE;
  series_record "invoice_series"%ROWTYPE;
BEGIN
  SELECT * INTO session_record FROM "pos_sessions"
  WHERE "id" = NEW."pos_session_id" AND "organization_id" = NEW."organization_id";
  SELECT * INTO series_record FROM "invoice_series"
  WHERE "id" = NEW."invoice_series_id" AND "organization_id" = NEW."organization_id";
  IF session_record."status" <> 'OPEN' OR session_record."company_id" <> NEW."company_id"
    OR session_record."branch_id" <> NEW."branch_id" OR session_record."warehouse_id" <> NEW."warehouse_id"
    OR series_record."company_id" <> NEW."company_id" OR series_record."document_type" <> 'SALES_INVOICE'
    OR series_record."financial_year" <> NEW."financial_year" OR series_record."prefix" <> NEW."series_prefix" THEN
    RAISE EXCEPTION 'sales invoice session and series ownership must match';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_invoices_scope_validate
BEFORE INSERT ON "sales_invoices"
FOR EACH ROW EXECUTE FUNCTION validate_sales_invoice_scope();

CREATE FUNCTION validate_sales_payment() RETURNS trigger AS $$
DECLARE
  invoice_record "sales_invoices"%ROWTYPE;
  session_record "pos_sessions"%ROWTYPE;
  allocated DECIMAL(14,2);
BEGIN
  SELECT * INTO invoice_record FROM "sales_invoices"
  WHERE "id" = NEW."sales_invoice_id" AND "organization_id" = NEW."organization_id" FOR UPDATE;
  SELECT * INTO session_record FROM "pos_sessions"
  WHERE "id" = NEW."pos_session_id" AND "organization_id" = NEW."organization_id";
  SELECT COALESCE(SUM("amount"), 0) INTO allocated FROM "sales_payments"
  WHERE "organization_id" = NEW."organization_id" AND "sales_invoice_id" = NEW."sales_invoice_id";
  IF invoice_record."status" <> 'POSTED' OR session_record."status" <> 'OPEN'
    OR invoice_record."company_id" <> NEW."company_id" OR invoice_record."branch_id" <> NEW."branch_id"
    OR invoice_record."pos_session_id" <> NEW."pos_session_id"
    OR allocated + NEW."amount" > invoice_record."total_amount" THEN
    RAISE EXCEPTION 'sales payment ownership or amount is invalid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_payments_validate
BEFORE INSERT ON "sales_payments"
FOR EACH ROW EXECUTE FUNCTION validate_sales_payment();

CREATE FUNCTION validate_cash_movement() RETURNS trigger AS $$
DECLARE
  session_record "pos_sessions"%ROWTYPE;
BEGIN
  SELECT * INTO session_record FROM "pos_sessions"
  WHERE "id" = NEW."pos_session_id" AND "organization_id" = NEW."organization_id";
  IF session_record."status" <> 'OPEN' OR session_record."company_id" <> NEW."company_id"
    OR session_record."branch_id" <> NEW."branch_id" THEN
    RAISE EXCEPTION 'cash movement must belong to an open matching POS session';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER cash_movements_validate
BEFORE INSERT ON "cash_movements"
FOR EACH ROW EXECUTE FUNCTION validate_cash_movement();

CREATE FUNCTION prevent_sales_invoice_mutation() RETURNS trigger AS $$
DECLARE
  paid DECIMAL(14,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'posted sales invoices are immutable';
  END IF;
  IF NEW."status" <> OLD."status" OR ROW(
    NEW."id", NEW."organization_id", NEW."company_id", NEW."branch_id", NEW."warehouse_id",
    NEW."pos_session_id", NEW."invoice_series_id", NEW."customer_id", NEW."financial_year",
    NEW."series_prefix", NEW."invoice_number", NEW."display_number", NEW."invoice_date",
    NEW."tax_treatment", NEW."place_of_supply_state_code", NEW."currency", NEW."gross_amount",
    NEW."discount_amount", NEW."taxable_value", NEW."cgst_amount", NEW."sgst_amount",
    NEW."igst_amount", NEW."cess_amount", NEW."round_off", NEW."total_amount", NEW."cost_amount",
    NEW."idempotency_key", NEW."posted_at", NEW."posted_by_user_id", NEW."created_at"
  ) IS DISTINCT FROM ROW(
    OLD."id", OLD."organization_id", OLD."company_id", OLD."branch_id", OLD."warehouse_id",
    OLD."pos_session_id", OLD."invoice_series_id", OLD."customer_id", OLD."financial_year",
    OLD."series_prefix", OLD."invoice_number", OLD."display_number", OLD."invoice_date",
    OLD."tax_treatment", OLD."place_of_supply_state_code", OLD."currency", OLD."gross_amount",
    OLD."discount_amount", OLD."taxable_value", OLD."cgst_amount", OLD."sgst_amount",
    OLD."igst_amount", OLD."cess_amount", OLD."round_off", OLD."total_amount", OLD."cost_amount",
    OLD."idempotency_key", OLD."posted_at", OLD."posted_by_user_id", OLD."created_at"
  ) THEN
    RAISE EXCEPTION 'posted sales invoices are immutable';
  END IF;
  SELECT COALESCE(SUM("amount"), 0) INTO paid FROM "sales_payments"
  WHERE "organization_id" = NEW."organization_id" AND "sales_invoice_id" = NEW."id";
  IF NEW."paid_amount" <> paid OR NEW."outstanding_amount" <> NEW."total_amount" - paid THEN
    RAISE EXCEPTION 'sales invoice payment projection must reconcile';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_invoices_immutable
BEFORE UPDATE OR DELETE ON "sales_invoices"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_invoice_mutation();

CREATE FUNCTION prevent_sales_financial_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'sales items, payments and cash movements are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sales_invoice_items_immutable
BEFORE UPDATE OR DELETE ON "sales_invoice_items"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_financial_mutation();
CREATE TRIGGER sales_payments_immutable
BEFORE UPDATE OR DELETE ON "sales_payments"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_financial_mutation();
CREATE TRIGGER cash_movements_immutable
BEFORE UPDATE OR DELETE ON "cash_movements"
FOR EACH ROW EXECUTE FUNCTION prevent_sales_financial_mutation();
