-- Mid/EOT inclusive week ranges (assessment-only weeks)

ALTER TABLE "SchemeTestSchedule" ADD COLUMN IF NOT EXISTS "midTermWeekEnd" INTEGER;
ALTER TABLE "SchemeTestSchedule" ADD COLUMN IF NOT EXISTS "endOfTermWeekEnd" INTEGER;
