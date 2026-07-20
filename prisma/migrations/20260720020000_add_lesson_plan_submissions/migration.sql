-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "LessonPlanSubmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "hodId" TEXT,
    "sessionId" TEXT,
    "topic" TEXT NOT NULL,
    "subject" TEXT,
    "grade" TEXT,
    "fileUrl" TEXT NOT NULL,
    "structuredContent" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "hodComments" TEXT,
    "diagramFailed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlanSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlanSubmission_schoolId_hodId_idx" ON "LessonPlanSubmission"("schoolId", "hodId");

-- CreateIndex
CREATE INDEX "LessonPlanSubmission_schoolId_teacherId_idx" ON "LessonPlanSubmission"("schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "LessonPlanSubmission_schoolId_status_idx" ON "LessonPlanSubmission"("schoolId", "status");

-- CreateIndex
CREATE INDEX "LessonPlanSubmission_teacherId_idx" ON "LessonPlanSubmission"("teacherId");

-- CreateIndex
CREATE INDEX "LessonPlanSubmission_sessionId_idx" ON "LessonPlanSubmission"("sessionId");

-- AddForeignKey
ALTER TABLE "LessonPlanSubmission" ADD CONSTRAINT "LessonPlanSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanSubmission" ADD CONSTRAINT "LessonPlanSubmission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanSubmission" ADD CONSTRAINT "LessonPlanSubmission_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanSubmission" ADD CONSTRAINT "LessonPlanSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
