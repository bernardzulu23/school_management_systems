-- Add result type (End of term, Midterm, Class test)
ALTER TABLE "Result" ADD COLUMN IF NOT EXISTS "resultType" TEXT NOT NULL DEFAULT 'END_OF_TERM';

CREATE INDEX IF NOT EXISTS "Result_resultType_idx" ON "Result"("resultType");
CREATE INDEX IF NOT EXISTS "Result_schoolId_resultType_idx" ON "Result"("schoolId", "resultType");
