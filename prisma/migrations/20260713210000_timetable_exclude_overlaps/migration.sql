-- Prompt 0: Prevent class/teacher double-booking at the DB layer.
-- Times are text (HH:MM); doubles/triples use ranges, so UNIQUE(periodNumber) is insufficient.
-- Scoped by schoolId + term + academicYear + status so draft + published can coexist.
-- Partial WHERE: only active rows (draft/published).

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION public.timetable_slot_int4range(start_time text, end_time text)
RETURNS int4range
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT int4range(
    split_part(start_time, ':', 1)::integer * 60
      + COALESCE(NULLIF(split_part(start_time, ':', 2), '')::integer, 0),
    split_part(end_time, ':', 1)::integer * 60
      + COALESCE(NULLIF(split_part(end_time, ':', 2), '')::integer, 0),
    '[)'
  );
$$;

ALTER TABLE "TimetableAllocationEntry"
  DROP CONSTRAINT IF EXISTS "TimetableAllocationEntry_no_class_overlap";

ALTER TABLE "TimetableAllocationEntry"
  DROP CONSTRAINT IF EXISTS "TimetableAllocationEntry_no_teacher_overlap";

ALTER TABLE "TimetableAllocationEntry"
  ADD CONSTRAINT "TimetableAllocationEntry_no_class_overlap"
  EXCLUDE USING gist (
    "schoolId" WITH =,
    term WITH =,
    "academicYear" WITH =,
    status WITH =,
    "classId" WITH =,
    "dayOfWeek" WITH =,
    public.timetable_slot_int4range("startTime", "endTime") WITH &&
  )
  WHERE (status IN ('draft', 'published'));

ALTER TABLE "TimetableAllocationEntry"
  ADD CONSTRAINT "TimetableAllocationEntry_no_teacher_overlap"
  EXCLUDE USING gist (
    "schoolId" WITH =,
    term WITH =,
    "academicYear" WITH =,
    status WITH =,
    "teacherId" WITH =,
    "dayOfWeek" WITH =,
    public.timetable_slot_int4range("startTime", "endTime") WITH &&
  )
  WHERE (status IN ('draft', 'published'));
