-- CreateEnum
CREATE TYPE "SchemeOfWorkStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "subject" TEXT NOT NULL,
    "gradeOrForm" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'pdf',
    "sourceUrl" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumUnit" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "weekHint" INTEGER,
    "title" TEXT NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "outcomes" JSONB NOT NULL DEFAULT '[]',
    "activities" JSONB NOT NULL DEFAULT '[]',
    "assessment" JSONB NOT NULL DEFAULT '[]',
    "resources" JSONB NOT NULL DEFAULT '[]',
    "durationMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeOfWork" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeOrForm" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weeks" JSONB NOT NULL,
    "status" "SchemeOfWorkStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Curriculum_schoolId_idx" ON "Curriculum"("schoolId");

-- CreateIndex
CREATE INDEX "Curriculum_subject_gradeOrForm_idx" ON "Curriculum"("subject", "gradeOrForm");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_schoolId_subject_gradeOrForm_key" ON "Curriculum"("schoolId", "subject", "gradeOrForm");

-- CreateIndex
CREATE INDEX "CurriculumUnit_curriculumId_idx" ON "CurriculumUnit"("curriculumId");

-- CreateIndex
CREATE INDEX "CurriculumUnit_curriculumId_sortOrder_idx" ON "CurriculumUnit"("curriculumId", "sortOrder");

-- CreateIndex
CREATE INDEX "SchemeOfWork_schoolId_idx" ON "SchemeOfWork"("schoolId");

-- CreateIndex
CREATE INDEX "SchemeOfWork_schoolId_teacherId_idx" ON "SchemeOfWork"("schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "SchemeOfWork_schoolId_subject_gradeOrForm_term_year_idx" ON "SchemeOfWork"("schoolId", "subject", "gradeOrForm", "term", "year");

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumUnit" ADD CONSTRAINT "CurriculumUnit_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
