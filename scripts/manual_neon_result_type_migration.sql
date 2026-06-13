
-- =============================================================================
-- ZSMS: Result type column (End of term / Midterm / Class test)
-- =============================================================================
-- Run in Neon SQL Editor on branch: import-2026-05-19 (ep-red-dawn-abn43kbe)
-- Project: school-management-system (flat-haze-98569249)
--
-- Matches Prisma migration: 20260612120000_result_type
-- Safe to re-run: uses IF NOT EXISTS / skips duplicate migration row.
-- =============================================================================

BEGIN;

-- 1) Add column (existing rows default to END_OF_TERM)
ALTER TABLE "Result"
  ADD COLUMN IF NOT EXISTS "resultType" TEXT NOT NULL DEFAULT 'END_OF_TERM';

-- 2) Indexes for headteacher / teacher filters
CREATE INDEX IF NOT EXISTS "Result_resultType_idx"
  ON "Result"("resultType");

CREATE INDEX IF NOT EXISTS "Result_schoolId_resultType_idx"
  ON "Result"("schoolId", "resultType");

-- 3) Register migration so `prisma migrate deploy` skips it later
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT
  gen_random_uuid()::text,
  '48053b44a3f5886061dfd8c078fbaff2230d727e67ae98b407e13c6610b05caa',
  NOW(),
  '20260612120000_result_type',
  NULL,
  NULL,
  NOW(),
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM "_prisma_migrations"
  WHERE migration_name = '20260612120000_result_type'
);

COMMIT;

-- =============================================================================
-- Verification (run after COMMIT if your editor runs statements separately)
-- =============================================================================

-- Column exists
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Result'
  AND column_name = 'resultType';

-- Migration recorded
SELECT migration_name, finished_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name = '20260612120000_result_type';

-- Row counts by type (should show END_OF_TERM for all legacy rows)
SELECT COALESCE("resultType", 'NULL') AS result_type, COUNT(*) AS row_count
FROM "Result"
GROUP BY 1
ORDER BY 1;