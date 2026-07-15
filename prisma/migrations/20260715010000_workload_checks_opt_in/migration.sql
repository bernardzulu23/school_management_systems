-- Prompt 7 follow-up: teacher workload checks are opt-in (default OFF).
-- Preserve existing threshold values; explicitly set enabled flags to false on
-- every school that already has a schedulingRules JSON record.
UPDATE "TimetableConfig"
SET "schedulingRules" =
  COALESCE("schedulingRules", '{}'::jsonb)
  || jsonb_build_object(
    'maxPeriodsPerDayEnabled', false,
    'maxConsecutivePeriodsEnabled', false,
    'requireBreakCoverageEnabled', false
  )
WHERE "schedulingRules" IS NOT NULL;
