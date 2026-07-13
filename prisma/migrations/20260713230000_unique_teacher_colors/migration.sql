-- Unique per-teacher timetable colours (aSc-style golden-angle sequence).
ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "lastAssignedTeacherHue" DOUBLE PRECISION NOT NULL DEFAULT -137.50776405003785;

ALTER TABLE "TeacherColor"
  ADD COLUMN IF NOT EXISTS "hueDegrees" DOUBLE PRECISION;
