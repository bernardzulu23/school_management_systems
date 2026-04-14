-- AlterTable
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "level" TEXT NOT NULL DEFAULT 'combined';

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIRequest" (
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
CREATE INDEX IF NOT EXISTS "AIRequest_schoolId_idx" ON "AIRequest"("schoolId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIRequest_feature_idx" ON "AIRequest"("feature");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIRequest_createdAt_idx" ON "AIRequest"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AIRequest_schoolId_fkey'
  ) THEN
    ALTER TABLE "AIRequest"
      ADD CONSTRAINT "AIRequest_schoolId_fkey"
      FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
