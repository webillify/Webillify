CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE');
CREATE TYPE "PriceTaxMode" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');
CREATE TYPE "StockMovementType" AS ENUM ('OPENING_STOCK', 'PURCHASE_RECEIPT', 'PURCHASE_RETURN', 'SALE_ISSUE', 'SALES_RETURN', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIPT', 'TRANSFER_DIFFERENCE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY', 'SCRAP', 'REVERSAL');

CREATE TABLE "categories" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "parent_id" UUID,
  "name" VARCHAR(140) NOT NULL, "normalized_code" VARCHAR(50) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "units" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(80) NOT NULL, "symbol" VARCHAR(20) NOT NULL, "decimal_places" SMALLINT NOT NULL DEFAULT 3,
  "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "units_decimal_places_check" CHECK ("decimal_places" BETWEEN 0 AND 6)
);
CREATE TABLE "tax_rates" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL, "rate" DECIMAL(5,2) NOT NULL, "cess_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "effective_from" TIMESTAMPTZ(3) NOT NULL, "effective_until" TIMESTAMPTZ(3), "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_rates_percentage_check" CHECK ("rate" BETWEEN 0 AND 100 AND "cess_rate" BETWEEN 0 AND 100),
  CONSTRAINT "tax_rates_period_check" CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from")
);
CREATE TABLE "products" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "category_id" UUID, "base_unit_id" UUID NOT NULL,
  "default_tax_rate_id" UUID, "normalized_code" VARCHAR(60) NOT NULL, "name" VARCHAR(180) NOT NULL,
  "description" VARCHAR(500), "product_type" "ProductType" NOT NULL DEFAULT 'GOODS', "hsn_sac" VARCHAR(12),
  "price_tax_mode" "PriceTaxMode" NOT NULL DEFAULT 'EXCLUSIVE', "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "product_variants" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "product_id" UUID NOT NULL, "sku" VARCHAR(80) NOT NULL,
  "name" VARCHAR(140), "sale_price" DECIMAL(14,2) NOT NULL, "purchase_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "track_inventory" BOOLEAN NOT NULL DEFAULT true, "serial_tracked" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_price_check" CHECK ("sale_price" >= 0 AND "purchase_cost" >= 0)
);
CREATE TABLE "product_barcodes" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "variant_id" UUID NOT NULL, "barcode" VARCHAR(80) NOT NULL,
  "barcode_type" VARCHAR(20) NOT NULL DEFAULT 'EAN', "primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "warehouses" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "company_id" UUID NOT NULL, "branch_id" UUID NOT NULL,
  "normalized_code" VARCHAR(40) NOT NULL, "name" VARCHAR(140) NOT NULL, "saleable" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "company_id" UUID NOT NULL, "branch_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL, "variant_id" UUID NOT NULL, "actor_user_id" UUID NOT NULL,
  "movement_type" "StockMovementType" NOT NULL, "quantity" DECIMAL(18,3) NOT NULL,
  "unit_cost" DECIMAL(14,4) NOT NULL, "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "source_type" VARCHAR(60) NOT NULL, "source_id" UUID NOT NULL, "idempotency_key" VARCHAR(120) NOT NULL,
  "reversal_of_id" UUID, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_quantity_check" CHECK ("quantity" <> 0),
  CONSTRAINT "stock_movements_cost_check" CHECK ("unit_cost" >= 0)
);
CREATE TABLE "stock_balances" (
  "organization_id" UUID NOT NULL, "warehouse_id" UUID NOT NULL, "variant_id" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL DEFAULT 0, "average_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("organization_id", "warehouse_id", "variant_id"),
  CONSTRAINT "stock_balances_cost_check" CHECK ("average_cost" >= 0)
);

CREATE INDEX "categories_organization_id_parent_id_active_idx" ON "categories"("organization_id", "parent_id", "active");
CREATE UNIQUE INDEX "categories_organization_id_normalized_code_key" ON "categories"("organization_id", "normalized_code");
CREATE UNIQUE INDEX "categories_id_organization_id_key" ON "categories"("id", "organization_id");
CREATE UNIQUE INDEX "units_organization_id_code_key" ON "units"("organization_id", "code");
CREATE UNIQUE INDEX "units_id_organization_id_key" ON "units"("id", "organization_id");
CREATE INDEX "tax_rates_organization_id_active_effective_from_idx" ON "tax_rates"("organization_id", "active", "effective_from");
CREATE UNIQUE INDEX "tax_rates_organization_id_code_effective_from_key" ON "tax_rates"("organization_id", "code", "effective_from");
CREATE UNIQUE INDEX "tax_rates_id_organization_id_key" ON "tax_rates"("id", "organization_id");
CREATE INDEX "products_organization_id_category_id_active_idx" ON "products"("organization_id", "category_id", "active");
CREATE UNIQUE INDEX "products_organization_id_normalized_code_key" ON "products"("organization_id", "normalized_code");
CREATE UNIQUE INDEX "products_id_organization_id_key" ON "products"("id", "organization_id");
CREATE INDEX "product_variants_organization_id_product_id_active_idx" ON "product_variants"("organization_id", "product_id", "active");
CREATE UNIQUE INDEX "product_variants_organization_id_sku_key" ON "product_variants"("organization_id", "sku");
CREATE UNIQUE INDEX "product_variants_id_organization_id_key" ON "product_variants"("id", "organization_id");
CREATE INDEX "product_barcodes_organization_id_variant_id_idx" ON "product_barcodes"("organization_id", "variant_id");
CREATE UNIQUE INDEX "product_barcodes_organization_id_barcode_key" ON "product_barcodes"("organization_id", "barcode");
CREATE INDEX "warehouses_organization_id_branch_id_active_idx" ON "warehouses"("organization_id", "branch_id", "active");
CREATE UNIQUE INDEX "warehouses_organization_id_normalized_code_key" ON "warehouses"("organization_id", "normalized_code");
CREATE UNIQUE INDEX "warehouses_id_organization_id_key" ON "warehouses"("id", "organization_id");
CREATE INDEX "stock_movements_organization_id_warehouse_id_variant_id_occ_idx" ON "stock_movements"("organization_id", "warehouse_id", "variant_id", "occurred_at");
CREATE INDEX "stock_movements_organization_id_source_type_source_id_idx" ON "stock_movements"("organization_id", "source_type", "source_id");
CREATE UNIQUE INDEX "stock_movements_id_organization_id_key" ON "stock_movements"("id", "organization_id");
CREATE UNIQUE INDEX "stock_movements_organization_id_idempotency_key_warehouse_i_key" ON "stock_movements"("organization_id", "idempotency_key", "warehouse_id", "variant_id", "movement_type");
CREATE INDEX "stock_balances_organization_id_variant_id_idx" ON "stock_balances"("organization_id", "variant_id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_organization_id_fkey" FOREIGN KEY ("parent_id", "organization_id") REFERENCES "categories"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_organization_id_fkey" FOREIGN KEY ("category_id", "organization_id") REFERENCES "categories"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_base_unit_id_organization_id_fkey" FOREIGN KEY ("base_unit_id", "organization_id") REFERENCES "units"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_default_tax_rate_id_organization_id_fkey" FOREIGN KEY ("default_tax_rate_id", "organization_id") REFERENCES "tax_rates"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_organization_id_fkey" FOREIGN KEY ("company_id", "organization_id") REFERENCES "companies"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversal_of_id_organization_id_fkey" FOREIGN KEY ("reversal_of_id", "organization_id") REFERENCES "stock_movements"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_warehouse_id_organization_id_fkey" FOREIGN KEY ("warehouse_id", "organization_id") REFERENCES "warehouses"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_variant_id_organization_id_fkey" FOREIGN KEY ("variant_id", "organization_id") REFERENCES "product_variants"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_stock_movement_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'stock_movements is append-only; create a reversal movement instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER stock_movements_immutable
BEFORE UPDATE OR DELETE ON "stock_movements"
FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_mutation();
