-- Prompt 22: Facial attendance consent & data governance (ZDPA)
-- Opt-in school gate, ConsentRecord ledger, retention hooks on Student.

ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "facialAttendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "faceEmbeddingRetentionDays" INTEGER NOT NULL DEFAULT 365;

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "faceEmbeddingEnrolledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "enrollmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS "Student_schoolId_enrollmentStatus_idx"
  ON "Student"("schoolId", "enrollmentStatus");

DO $$ BEGIN
  CREATE TYPE "ConsentType" AS ENUM ('FACIAL_RECOGNITION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConsentCaptureMethod" AS ENUM (
    'IN_APP', 'PAPER_FORM', 'DIGITIZED', 'VERBAL_WITH_WITNESS', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConsentRecord" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "pupilId" TEXT NOT NULL,
  "consentType" "ConsentType" NOT NULL DEFAULT 'FACIAL_RECOGNITION',
  "status" "ConsentStatus" NOT NULL,
  "grantedByName" TEXT NOT NULL,
  "grantedByRelationship" TEXT NOT NULL,
  "grantedByContact" TEXT,
  "grantedAt" TIMESTAMP(3),
  "method" "ConsentCaptureMethod" NOT NULL DEFAULT 'PAPER_FORM',
  "withdrawnAt" TIMESTAMP(3),
  "notes" TEXT,
  "recordedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConsentRecord_schoolId_pupilId_consentType_idx"
  ON "ConsentRecord"("schoolId", "pupilId", "consentType");
CREATE INDEX IF NOT EXISTS "ConsentRecord_schoolId_consentType_status_idx"
  ON "ConsentRecord"("schoolId", "consentType", "status");
CREATE INDEX IF NOT EXISTS "ConsentRecord_pupilId_consentType_status_idx"
  ON "ConsentRecord"("pupilId", "consentType", "status");

DO $$ BEGIN
  ALTER TABLE "ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_pupilId_fkey"
    FOREIGN KEY ("pupilId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Defensive purge: Prompt 21 found 0 rows; clear any orphan embeddings without active consent.
UPDATE "Student" s
SET "faceEmbedding" = NULL,
    "faceEmbeddingEnrolledAt" = NULL
WHERE s."faceEmbedding" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ConsentRecord" c
    WHERE c."pupilId" = s.id
      AND c."consentType" = 'FACIAL_RECOGNITION'
      AND c."status" = 'GRANTED'
      AND c."withdrawnAt" IS NULL
  );
