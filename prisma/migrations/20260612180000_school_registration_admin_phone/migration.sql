-- Persist admin phone for onboarding welcome SMS (survives email verification steps)
ALTER TABLE "SchoolRegistration" ADD COLUMN IF NOT EXISTS "adminPhone" TEXT;
