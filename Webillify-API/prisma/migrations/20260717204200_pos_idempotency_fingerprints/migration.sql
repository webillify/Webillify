ALTER TABLE "pos_sessions" ADD COLUMN "opening_idempotency_key" VARCHAR(120);
UPDATE "pos_sessions" SET "opening_idempotency_key" = 'legacy-session-' || "id"::text;
ALTER TABLE "pos_sessions" ALTER COLUMN "opening_idempotency_key" SET NOT NULL;

ALTER TABLE "sales_invoices" ADD COLUMN "request_hash" CHAR(64);
UPDATE "sales_invoices" SET "request_hash" = md5("id"::text) || md5("id"::text);
ALTER TABLE "sales_invoices" ALTER COLUMN "request_hash" SET NOT NULL;

CREATE UNIQUE INDEX "pos_sessions_organization_id_opening_idempotency_key_key"
  ON "pos_sessions"("organization_id", "opening_idempotency_key");
