-- Primary scheme week-2 assessment fields + Activity weekly schedule days
ALTER TABLE "SchemeTestSchedule" ADD COLUMN IF NOT EXISTS "week2AssessmentWeek" INTEGER;
ALTER TABLE "SchemeTestSchedule" ADD COLUMN IF NOT EXISTS "week2AssessmentWeekEnd" INTEGER;

ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "scheduleDays" TEXT[] DEFAULT ARRAY[]::TEXT[];
