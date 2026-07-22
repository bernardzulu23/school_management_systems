-- CreateEnum
CREATE TYPE "EczValidationSource" AS ENUM ('ecz_practice', 'ecz_exam_questions');

-- CreateTable
CREATE TABLE "EczValidationLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "source" "EczValidationSource" NOT NULL,
    "generationId" TEXT NOT NULL,
    "clientItemId" TEXT NOT NULL,
    "aiRequestId" TEXT,
    "requestId" TEXT,
    "subjectCode" TEXT NOT NULL,
    "topicTag" TEXT NOT NULL,
    "resolvedEocId" TEXT,
    "examLevelOrForm" TEXT,
    "valid" BOOLEAN NOT NULL,
    "issues" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EczValidationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EczValidationLog_schoolId_createdAt_idx" ON "EczValidationLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "EczValidationLog_schoolId_source_createdAt_idx" ON "EczValidationLog"("schoolId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "EczValidationLog_generationId_idx" ON "EczValidationLog"("generationId");

-- CreateIndex
CREATE INDEX "EczValidationLog_schoolId_subjectCode_topicTag_idx" ON "EczValidationLog"("schoolId", "subjectCode", "topicTag");

-- CreateIndex
CREATE INDEX "EczValidationLog_schoolId_valid_createdAt_idx" ON "EczValidationLog"("schoolId", "valid", "createdAt");

-- CreateIndex
CREATE INDEX "EczValidationLog_clientItemId_idx" ON "EczValidationLog"("clientItemId");

-- CreateIndex
CREATE INDEX "EczValidationLog_aiRequestId_idx" ON "EczValidationLog"("aiRequestId");

-- AddForeignKey
ALTER TABLE "EczValidationLog" ADD CONSTRAINT "EczValidationLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
