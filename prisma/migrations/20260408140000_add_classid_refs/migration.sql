-- Add classId foreign keys to normalize class references across the system

ALTER TABLE "Student" ADD COLUMN "classId" TEXT;
ALTER TABLE "Student"
  ADD CONSTRAINT "Student_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

ALTER TABLE "Assessment" ADD COLUMN "classId" TEXT;
ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Assessment_classId_idx" ON "Assessment"("classId");

ALTER TABLE "Assignment" ADD COLUMN "classId" TEXT;
ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

