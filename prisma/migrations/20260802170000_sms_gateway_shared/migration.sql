-- Shared platform SMS gateway: one phone can serve all opted-in schools.

ALTER TABLE "SMSGateway" ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN NOT NULL DEFAULT false;

-- Allow platform-owned gateways with no school binding.
ALTER TABLE "SMSGateway" ALTER COLUMN "schoolId" DROP NOT NULL;

ALTER TABLE "SMSGateway" DROP CONSTRAINT IF EXISTS "SMSGateway_schoolId_fkey";
ALTER TABLE "SMSGateway" ADD CONSTRAINT "SMSGateway_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SMSGateway_isShared_isActive_idx" ON "SMSGateway"("isShared", "isActive");

-- Promote the newest active gateway to shared; deactivate other active rows.
WITH chosen AS (
  SELECT id
  FROM "SMSGateway"
  WHERE "isActive" = true
  ORDER BY "updatedAt" DESC
  LIMIT 1
)
UPDATE "SMSGateway" AS g
SET
  "isShared" = true,
  "schoolId" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM chosen
WHERE g.id = chosen.id;

UPDATE "SMSGateway"
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "isActive" = true
  AND "isShared" = false;
