-- Phase 5 M2/M3: per-parent SMS opt-out + PII access audit log
ALTER TABLE "ParentProfile" ADD COLUMN IF NOT EXISTS "smsOptOutAll" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ParentProfile" ADD COLUMN IF NOT EXISTS "smsOptOutAttendance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ParentProfile" ADD COLUMN IF NOT EXISTS "smsOptOutFees" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "SmsContactOptOut" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "optOutAll" BOOLEAN NOT NULL DEFAULT false,
    "optOutAttendance" BOOLEAN NOT NULL DEFAULT false,
    "optOutFees" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsContactOptOut_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmsContactOptOut_schoolId_phoneNormalized_key"
  ON "SmsContactOptOut"("schoolId", "phoneNormalized");
CREATE INDEX IF NOT EXISTS "SmsContactOptOut_schoolId_idx" ON "SmsContactOptOut"("schoolId");

DO $$ BEGIN
  ALTER TABLE "SmsContactOptOut"
    ADD CONSTRAINT "SmsContactOptOut_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PiiAccessLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "fieldsAccessed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PiiAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PiiAccessLog_schoolId_createdAt_idx" ON "PiiAccessLog"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "PiiAccessLog_actorUserId_createdAt_idx" ON "PiiAccessLog"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "PiiAccessLog_resourceType_resourceId_idx" ON "PiiAccessLog"("resourceType", "resourceId");
