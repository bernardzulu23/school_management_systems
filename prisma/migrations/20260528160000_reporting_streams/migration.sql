-- Reporting streams: province + district segmentation for monitoring and future admin scopes

ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "reportingStreamKey" TEXT;
CREATE INDEX IF NOT EXISTS "School_reportingStreamKey_idx" ON "School"("reportingStreamKey");
CREATE INDEX IF NOT EXISTS "School_district_idx" ON "School"("district");

ALTER TABLE "SchoolRegistration" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "SchoolRegistration" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "SchoolRegistration" ADD COLUMN IF NOT EXISTS "reportingStreamKey" TEXT;
CREATE INDEX IF NOT EXISTS "SchoolRegistration_reportingStreamKey_idx" ON "SchoolRegistration"("reportingStreamKey");

-- Backfill stream keys where province and district exist
UPDATE "School"
SET "reportingStreamKey" = lower(regexp_replace("province", '[^a-zA-Z0-9]+', '-', 'g'))
  || '__' || lower(regexp_replace("district", '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "reportingStreamKey" IS NULL
  AND "province" IS NOT NULL AND trim("province") <> ''
  AND "district" IS NOT NULL AND trim("district") <> '';
