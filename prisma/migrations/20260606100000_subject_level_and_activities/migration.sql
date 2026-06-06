-- Subject level tagging, school local languages, extracurricular activity updates

ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "enabledLocalLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;

UPDATE "Subject" SET "educationLevel" = 'secondary' WHERE "educationLevel" IS NULL;

ALTER TABLE "Activity" ALTER COLUMN "description" SET DEFAULT '';
ALTER TABLE "Activity" ALTER COLUMN "date" DROP NOT NULL;
ALTER TABLE "Activity" ALTER COLUMN "location" DROP NOT NULL;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ActivityParticipant" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ActivityParticipant" ADD COLUMN IF NOT EXISTS "studentId" TEXT;

ALTER TABLE "ActivityParticipant" DROP CONSTRAINT IF EXISTS "ActivityParticipant_activityId_userId_key";
ALTER TABLE "ActivityParticipant" DROP CONSTRAINT IF EXISTS "ActivityParticipant_activityId_fkey";

ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityParticipant_activityId_userId_key"
  ON "ActivityParticipant"("activityId", "userId") WHERE "userId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityParticipant_activityId_studentId_key"
  ON "ActivityParticipant"("activityId", "studentId") WHERE "studentId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Subject_educationLevel_idx" ON "Subject"("educationLevel");
CREATE INDEX IF NOT EXISTS "Activity_isActive_idx" ON "Activity"("isActive");
CREATE INDEX IF NOT EXISTS "ActivityParticipant_studentId_idx" ON "ActivityParticipant"("studentId");
