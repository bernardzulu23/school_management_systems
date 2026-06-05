-- CreateEnum
CREATE TYPE "AssessmentReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "reviewerUserId" TEXT,
ADD COLUMN "status" "AssessmentReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "topic" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "approvalNotes" TEXT,
ADD COLUMN "publishedAssignmentId" TEXT,
ADD COLUMN "aiAnalysis" JSONB;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "assessmentId" TEXT;

-- CreateIndex
CREATE INDEX "Assessment_schoolId_status_idx" ON "Assessment"("schoolId", "status");
CREATE INDEX "Assessment_schoolId_reviewerUserId_status_idx" ON "Assessment"("schoolId", "reviewerUserId", "status");
CREATE INDEX "Assessment_schoolId_createdByUserId_idx" ON "Assessment"("schoolId", "createdByUserId");
CREATE INDEX "Assignment_assessmentId_idx" ON "Assignment"("assessmentId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
