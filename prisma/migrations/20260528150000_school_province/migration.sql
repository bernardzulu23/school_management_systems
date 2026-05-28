-- Add province/district for platform super-admin geographic reporting
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "district" TEXT;

CREATE INDEX IF NOT EXISTS "School_province_idx" ON "School"("province");
