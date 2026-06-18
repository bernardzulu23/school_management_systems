-- Parent attendance SMS toggles per school (SchoolSmsSettings)
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "parentSmsAbsent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "parentSmsLate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "parentSmsPresent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "parentSmsExcused" BOOLEAN NOT NULL DEFAULT false;
