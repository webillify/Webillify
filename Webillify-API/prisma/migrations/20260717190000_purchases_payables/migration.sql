CREATE TYPE "PurchaseBillStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('POSTED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'UPI', 'CARD', 'OTHER');

CREATE TABLE "suppliers" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "normalized_code" VARCHAR(60) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "normalized_name" VARCHAR(180) NOT NULL,
  "gstin" VARCHAR(15),
  "phone" VARCHAR(30),
  "email" VARCHAR(320),
  "credit_days" SMALLINT NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "suppliers_credit_days_check" CHECK ("credit_days" BETWEEN 0 AND 3650)
);

CREATE TABLE "purchase_bills" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "status" "PurchaseBillStatus" NOT NULL DEFAULT 'DRAFT',
  "supplier_invoice_reference" VARCHAR(100) NOT NULL,
  "normalized_reference" VARCHAR(100) NOT NULL,
  "invoice_date" DATE NOT NULL,
  "due_date" DATE,
  "currency" CHAR(3) NOT NULL DEFAULT 'INR',
  "taxable_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "sgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "igst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cess_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "outstanding_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "input_tax_eligible" BOOLEAN NOT NULL DEFAULT false,
  "posting_idempotency_key" VARCHAR(120),
  "posted_at" TIMESTAMPTZ(3),
  "posted_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "purchase_bills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_bills_dates_check" CHECK ("due_date" IS NULL OR "due_date" >= "invoice_date"),
  CONSTRAINT "purchase_bills_amounts_check" CHECK (
    "taxable_value" >= 0 AND "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND
    "igst_amount" >= 0 AND "cess_amount" >= 0 AND "round_off" BETWEEN -0.99 AND 0.99 AND
    "total_amount" >= 0 AND "paid_amount" >= 0 AND "outstanding_amount" >= 0 AND
    "paid_amount" <= "total_amount" AND "outstanding_amount" = "total_amount" - "paid_amount"
  ),
  CONSTRAINT "purchase_bills_posting_state_check" CHECK (
    ("status" = 'POSTED' AND "posted_at" IS NOT NULL AND "posted_by_user_id" IS NOT NULL AND "posting_idempotency_key" IS NOT NULL)
    OR ("status" <> 'POSTED')
  )
);

CREATE TABLE "purchase_bill_items" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "purchase_bill_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "description" VARCHAR(240) NOT NULL,
  "hsn_sac" VARCHAR(12),
  "quantity" DECIMAL(18,3) NOT NULL,
  "unit_cost" DECIMAL(14,4) NOT NULL,
  "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxable_value" DECIMAL(14,2) NOT NULL,
  "tax_rate" DECIMAL(5,2) NOT NULL,
  "cgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "sgst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "igst_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cess_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "line_total" DECIMAL(14,2) NOT NULL,
  "input_tax_eligible" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "purchase_bill_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_bill_items_amounts_check" CHECK (
    "quantity" > 0 AND "unit_cost" >= 0 AND "discount_amount" >= 0 AND
    "taxable_value" >= 0 AND "tax_rate" BETWEEN 0 AND 100 AND
    "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND
    "cess_amount" >= 0 AND "line_total" >= 0
  )
);

CREATE TABLE "supplier_payments" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'POSTED',
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "reference" VARCHAR(120),
  "paid_at" TIMESTAMPTZ(3) NOT NULL,
  "idempotency_key" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_payments_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "supplier_payment_allocations" (
  "organization_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "purchase_bill_id" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payment_allocations_pkey" PRIMARY KEY ("organization_id", "payment_id", "purchase_bill_id"),
  CONSTRAINT "supplier_payment_allocations_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX "suppliers_organization_id_normalized_name_active_idx" ON "suppliers"("organization_id", "normalized_name", "active");
CREATE UNIQUE INDEX "suppliers_organization_id_normalized_code_key" ON "suppliers"("organization_id", "normalized_code");
CREATE UNIQUE INDEX "suppliers_id_organization_id_key" ON "suppliers"("id", "organization_id");
CREATE INDEX "purchase_bills_organization_id_branch_id_status_invoice_dat_idx" ON "purchase_bills"("organization_id", "branch_id", "status", "invoice_date");
CREATE INDEX "purchase_bills_organization_id_supplier_id_status_due_date_idx" ON "purchase_bills"("organization_id", "supplier_id", "status", "due_date");
CREATE UNIQUE INDEX "purchase_bills_id_organization_id_key" ON "purchase_bills"("id", "organization_id");
CREATE UNIQUE INDEX "purchase_bills_organization_id_company_id_supplier_id_norma_key" ON "purchase_bills"("organization_id", "company_id", "supplier_id", "normalized_reference");
CREATE UNIQUE INDEX "purchase_bills_organization_id_posting_idempotency_key_key" ON "purchase_bills"("organization_id", "posting_idempotency_key");
CREATE INDEX "purchase_bill_items_organization_id_purchase_bill_id_idx" ON "purchase_bill_items"("organization_id", "purchase_bill_id");
CREATE UNIQUE INDEX "purchase_bill_items_id_organization_id_key" ON "purchase_bill_items"("id", "organization_id");
CREATE INDEX "supplier_payments_organization_id_supplier_id_paid_at_idx" ON "supplier_payments"("organization_id", "supplier_id", "paid_at");
CREATE UNIQUE INDEX "supplier_payments_id_organization_id_key" ON "supplier_payments"("id", "organization_id");
CREATE UNIQUE INDEX "supplier_payments_organization_id_idempotency_key_key" ON "supplier_payments"("organization_id", "idempotency_key");
CREATE INDEX "supplier_payment_allocations_organization_id_purchase_bill__idx" ON "supplier_payment_allocations"("organization_id", "purchase_bill_id");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_supplier_id_organization_id_fkey" FOREIGN KEY ("supplier_id", "organization_id") REFERENCES "suppliers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_purchase_bill_id_organization_id_fkey" FOREIGN KEY ("purchase_bill_id", "organization_id") REFERENCES "purchase_bills"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_organization_id_fkey" FOREIGN KEY ("supplier_id", "organization_id") REFERENCES "suppliers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_payment_id_organization_id_fkey" FOREIGN KEY ("payment_id", "organization_id") REFERENCES "supplier_payments"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_purchase_bill_id_organization_fkey" FOREIGN KEY ("purchase_bill_id", "organization_id") REFERENCES "purchase_bills"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_posted_purchase_bill_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'POSTED' THEN
    RAISE EXCEPTION 'posted purchase bills are immutable';
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

CREATE FUNCTION prevent_posted_purchase_item_mutation() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "purchase_bills"
    WHERE "id" = OLD."purchase_bill_id" AND "organization_id" = OLD."organization_id" AND "status" = 'POSTED'
  ) THEN
    RAISE EXCEPTION 'posted purchase bill items are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_bill_items_posted_immutable
BEFORE UPDATE OR DELETE ON "purchase_bill_items"
FOR EACH ROW EXECUTE FUNCTION prevent_posted_purchase_item_mutation();

CREATE FUNCTION prevent_supplier_payment_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'supplier payments and allocations are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_payments_immutable
BEFORE UPDATE OR DELETE ON "supplier_payments"
FOR EACH ROW EXECUTE FUNCTION prevent_supplier_payment_mutation();

CREATE TRIGGER supplier_payment_allocations_immutable
BEFORE UPDATE OR DELETE ON "supplier_payment_allocations"
FOR EACH ROW EXECUTE FUNCTION prevent_supplier_payment_mutation();
