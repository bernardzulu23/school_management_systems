-- AlterTable
ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS "topicKey" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonPlan_schoolId_topicKey_idx" ON "LessonPlan"("schoolId", "topicKey");
