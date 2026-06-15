-- ECSEOL exemplars, primary CBC ratings, lesson plan construct fields, SBA moderation

CREATE TYPE "EczExemplarBand" AS ENUM ('sba_task', 'exam_scenario');
CREATE TYPE "CbcRatingLevel" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT');

CREATE TABLE "EczExemplar" (
    "id" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "form" INTEGER NOT NULL,
    "band" "EczExemplarBand" NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "task" TEXT,
    "taskType" TEXT,
    "materials" JSONB,
    "rubricJson" JSONB,
    "demonstration" TEXT,
    "examSubQuestionsJson" JSONB,
    "source" TEXT NOT NULL DEFAULT 'ecseol_2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EczExemplar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EczExemplar_subjectCode_form_band_idx" ON "EczExemplar"("subjectCode", "form", "band");
CREATE INDEX "EczExemplar_subjectName_idx" ON "EczExemplar"("subjectName");

CREATE TABLE "CbcCompetencyRating" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "level" "CbcRatingLevel" NOT NULL,
    "evidenceNote" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbcCompetencyRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CbcCompetencyRating_schoolId_studentId_competencyId_term_academicYear_key"
  ON "CbcCompetencyRating"("schoolId", "studentId", "competencyId", "term", "academicYear");
CREATE INDEX "CbcCompetencyRating_schoolId_gradeLevel_term_academicYear_idx"
  ON "CbcCompetencyRating"("schoolId", "gradeLevel", "term", "academicYear");
CREATE INDEX "CbcCompetencyRating_studentId_idx" ON "CbcCompetencyRating"("studentId");

ALTER TABLE "CbcCompetencyRating" ADD CONSTRAINT "CbcCompetencyRating_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CbcCompetencyRating" ADD CONSTRAINT "CbcCompetencyRating_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CbcCompetencyRating" ADD CONSTRAINT "CbcCompetencyRating_competencyId_fkey"
  FOREIGN KEY ("competencyId") REFERENCES "EczCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CbcCompetencyRating" ADD CONSTRAINT "CbcCompetencyRating_recordedBy_fkey"
  FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS "constructElementIds" JSONB;
ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS "constructStatement" TEXT;
ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS "sbaTaskType" TEXT;

ALTER TABLE "EczAssessment" ADD COLUMN IF NOT EXISTS "exemplarId" TEXT;
ALTER TABLE "EczAssessment" ADD COLUMN IF NOT EXISTS "moderationStatus" "EczModerationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "EczAssessment" ADD COLUMN IF NOT EXISTS "moderationNotes" TEXT;
ALTER TABLE "EczAssessment" ADD COLUMN IF NOT EXISTS "moderatedBy" TEXT;
ALTER TABLE "EczAssessment" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "EczAssessment_schoolId_moderationStatus_idx"
  ON "EczAssessment"("schoolId", "moderationStatus");
