-- Multimedia lessons for Creative Teaching Hub (replace localStorage fake save)

CREATE TABLE IF NOT EXISTS "MultimediaLesson" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 45,
    "objectives" JSONB NOT NULL,
    "slides" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MultimediaLesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MultimediaLesson_schoolId_idx" ON "MultimediaLesson"("schoolId");
CREATE INDEX IF NOT EXISTS "MultimediaLesson_schoolId_createdByUserId_idx" ON "MultimediaLesson"("schoolId", "createdByUserId");
CREATE INDEX IF NOT EXISTS "MultimediaLesson_schoolId_subject_grade_idx" ON "MultimediaLesson"("schoolId", "subject", "grade");

ALTER TABLE "MultimediaLesson"
  ADD CONSTRAINT "MultimediaLesson_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MultimediaLesson"
  ADD CONSTRAINT "MultimediaLesson_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
