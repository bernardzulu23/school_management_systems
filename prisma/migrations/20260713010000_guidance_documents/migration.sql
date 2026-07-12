-- CreateEnum
CREATE TYPE "GuidanceDocKind" AS ENUM (
  'INDIVIDUAL_COUNSELLING',
  'GROUP_COUNSELLING',
  'CAREER',
  'ACADEMIC',
  'SPECIAL_NEEDS_REFERRAL',
  'BEHAVIOUR',
  'SOCIAL_PREVENTION',
  'PARENT_GUARDIAN',
  'STAFF_CONSULT',
  'PROGRAMME',
  'CONFIDENTIAL_RECORD',
  'EXTERNAL_REFERRAL',
  'MENTAL_HEALTH',
  'PROGRESS_FOLLOWUP',
  'INCLUSION',
  'GENERAL'
);

-- AlterEnum
ALTER TYPE "CaseAccessAction" ADD VALUE 'DOCUMENT_VIEW';
ALTER TYPE "CaseAccessAction" ADD VALUE 'DOCUMENT_UPLOAD';

-- CreateTable
CREATE TABLE "GuidanceDocument" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "GuidanceDocKind" NOT NULL DEFAULT 'GENERAL',
    "confidentiality" "ConfidentialityTier" NOT NULL DEFAULT 'SENSITIVE',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pupilId" TEXT,
    "caseId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "GuidanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuidanceDocument_schoolId_createdAt_idx" ON "GuidanceDocument"("schoolId", "createdAt");
CREATE INDEX "GuidanceDocument_schoolId_caseId_idx" ON "GuidanceDocument"("schoolId", "caseId");
CREATE INDEX "GuidanceDocument_schoolId_pupilId_idx" ON "GuidanceDocument"("schoolId", "pupilId");
CREATE INDEX "GuidanceDocument_schoolId_kind_idx" ON "GuidanceDocument"("schoolId", "kind");
CREATE INDEX "GuidanceDocument_schoolId_archivedAt_idx" ON "GuidanceDocument"("schoolId", "archivedAt");

-- AddForeignKey
ALTER TABLE "GuidanceDocument" ADD CONSTRAINT "GuidanceDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceDocument" ADD CONSTRAINT "GuidanceDocument_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuidanceDocument" ADD CONSTRAINT "GuidanceDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuidanceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuidanceDocument" ADD CONSTRAINT "GuidanceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
