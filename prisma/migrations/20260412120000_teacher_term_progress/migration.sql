CREATE TABLE "TeacherTermProgress" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "cpdHours" INTEGER NOT NULL DEFAULT 0,
  "cpdTargetHours" INTEGER NOT NULL DEFAULT 10,
  "schemeSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "recordsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeacherTermProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherTermProgress_teacherId_year_term_key" ON "TeacherTermProgress"("teacherId", "year", "term");
CREATE INDEX "TeacherTermProgress_schoolId_year_term_idx" ON "TeacherTermProgress"("schoolId", "year", "term");
CREATE INDEX "TeacherTermProgress_teacherId_idx" ON "TeacherTermProgress"("teacherId");

ALTER TABLE "TeacherTermProgress"
ADD CONSTRAINT "TeacherTermProgress_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherTermProgress"
ADD CONSTRAINT "TeacherTermProgress_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

