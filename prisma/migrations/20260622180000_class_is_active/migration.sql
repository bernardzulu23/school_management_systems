-- Mark classes with no students, teaching load, or timetable rows as inactive.
ALTER TABLE "Class" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Class_schoolId_isActive_idx" ON "Class"("schoolId", "isActive");

UPDATE "Class" AS c
SET "isActive" = false
WHERE NOT EXISTS (SELECT 1 FROM "Student" s WHERE s."classId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "TeachingAssignment" t WHERE t."classId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "TimetableAllocationEntry" e WHERE e."classId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "TeacherAllocation" a WHERE a."classId" = c."id");
