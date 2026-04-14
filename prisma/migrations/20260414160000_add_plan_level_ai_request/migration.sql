-- AlterTable
ALTER TABLE "School" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "School" ADD COLUMN     "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'combined';

-- CreateTable
CREATE TABLE "AIRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIRequest_schoolId_idx" ON "AIRequest"("schoolId");

-- CreateIndex
CREATE INDEX "AIRequest_feature_idx" ON "AIRequest"("feature");

-- CreateIndex
CREATE INDEX "AIRequest_createdAt_idx" ON "AIRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

