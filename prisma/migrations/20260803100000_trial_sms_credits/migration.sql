-- Trial SMS credit ledger fields on SchoolSmsSettings
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "smsLifetimeGranted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "smsLifetimeUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "trialSmsGrantedAt" TIMESTAMP(3);
