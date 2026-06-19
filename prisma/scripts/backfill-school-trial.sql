-- Backfill trial end dates for legacy schools (plan=trial, trialEndsAt NULL).
-- Run once on production after deploying SchoolFeePayment / login fixes.
--
-- 1) Anchor trial to school creation when available
UPDATE "School"
SET "trialEndsAt" = "createdAt" + INTERVAL '60 days',
    "updatedAt" = NOW()
WHERE "plan" = 'trial'
  AND "trialEndsAt" IS NULL
  AND "active" = true
  AND "createdAt" IS NOT NULL;

-- 2) Any remaining active trial schools without a date get a fresh 60-day trial
UPDATE "School"
SET "trialEndsAt" = NOW() + INTERVAL '60 days',
    "updatedAt" = NOW()
WHERE "plan" = 'trial'
  AND "trialEndsAt" IS NULL
  AND "active" = true;

-- 3) Active schools stuck with emailVerified=false (pre-verification-flow data)
UPDATE "School"
SET "emailVerified" = true,
    "updatedAt" = NOW()
WHERE "active" = true
  AND "emailVerified" = false;
