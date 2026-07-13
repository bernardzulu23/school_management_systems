-- Teacher↔class session rules (min gap between different-subject returns, severities).
-- Stored on TimetableConfig next to bell schedule; defaults applied in app code when null.
ALTER TABLE "TimetableConfig"
  ADD COLUMN IF NOT EXISTS "schedulingRules" JSONB;
