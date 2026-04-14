CREATE TABLE IF NOT EXISTS "AIUsageLog" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AIUsageLog_schoolId_monthKey_featureId_key"
ON "AIUsageLog" ("schoolId", "monthKey", "featureId");

CREATE INDEX IF NOT EXISTS "AIUsageLog_schoolId_monthKey_idx"
ON "AIUsageLog" ("schoolId", "monthKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AIUsageLog_schoolId_fkey'
  ) THEN
    ALTER TABLE "AIUsageLog"
      ADD CONSTRAINT "AIUsageLog_schoolId_fkey"
      FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

