-- Link lesson plans to scheme weeks for taught-progress tracking

ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER;
ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS "schemeId" TEXT;

CREATE INDEX IF NOT EXISTS "LessonPlan_schoolId_subject_grade_status_idx"
  ON "LessonPlan"("schoolId", "subject", "grade", "status");
CREATE INDEX IF NOT EXISTS "LessonPlan_schemeId_weekNumber_idx"
  ON "LessonPlan"("schemeId", "weekNumber");

DO $$ BEGIN
  ALTER TABLE "LessonPlan"
    ADD CONSTRAINT "LessonPlan_schemeId_fkey"
    FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
