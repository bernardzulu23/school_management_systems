-- AlterTable
ALTER TABLE "EczAssessment" ADD COLUMN "classId" TEXT;

-- CreateIndex
CREATE INDEX "EczAssessment_classId_idx" ON "EczAssessment"("classId");

-- AddForeignKey
ALTER TABLE "EczAssessment" ADD CONSTRAINT "EczAssessment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
