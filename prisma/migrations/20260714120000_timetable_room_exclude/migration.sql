-- Prompt 6: Prevent two classes sharing the same physical room/lab at overlapping times.
-- classroomId is optional; NULL rows are excluded from the constraint (form-room / unassigned).

ALTER TABLE "TeacherAllocation"
  ADD COLUMN IF NOT EXISTS "classroomId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAllocation_classroomId_fkey'
  ) THEN
    ALTER TABLE "TeacherAllocation"
      ADD CONSTRAINT "TeacherAllocation_classroomId_fkey"
      FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TeacherAllocation_classroomId_idx"
  ON "TeacherAllocation"("classroomId");

ALTER TABLE "TimetableAllocationEntry"
  ADD COLUMN IF NOT EXISTS "classroomId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TimetableAllocationEntry_classroomId_fkey'
  ) THEN
    ALTER TABLE "TimetableAllocationEntry"
      ADD CONSTRAINT "TimetableAllocationEntry_classroomId_fkey"
      FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TimetableAllocationEntry_schoolId_classroomId_dayOfWeek_idx"
  ON "TimetableAllocationEntry"("schoolId", "classroomId", "dayOfWeek");

ALTER TABLE "TimetableAllocationEntry"
  DROP CONSTRAINT IF EXISTS "TimetableAllocationEntry_no_room_overlap";

ALTER TABLE "TimetableAllocationEntry"
  ADD CONSTRAINT "TimetableAllocationEntry_no_room_overlap"
  EXCLUDE USING gist (
    "schoolId" WITH =,
    term WITH =,
    "academicYear" WITH =,
    status WITH =,
    "classroomId" WITH =,
    "dayOfWeek" WITH =,
    public.timetable_slot_int4range("startTime", "endTime") WITH &&
  )
  WHERE (status IN ('draft', 'published') AND "classroomId" IS NOT NULL);
