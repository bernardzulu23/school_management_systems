CREATE TABLE "StrategicGoal" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3),
  "schoolId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StrategicGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategicReview" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StrategicReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrategicGoal_schoolId_idx" ON "StrategicGoal"("schoolId");
CREATE INDEX "StrategicGoal_status_idx" ON "StrategicGoal"("status");
CREATE INDEX "StrategicGoal_dueDate_idx" ON "StrategicGoal"("dueDate");

CREATE INDEX "StrategicReview_schoolId_idx" ON "StrategicReview"("schoolId");
CREATE INDEX "StrategicReview_scheduledAt_idx" ON "StrategicReview"("scheduledAt");

ALTER TABLE "StrategicGoal"
ADD CONSTRAINT "StrategicGoal_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategicGoal"
ADD CONSTRAINT "StrategicGoal_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StrategicReview"
ADD CONSTRAINT "StrategicReview_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategicReview"
ADD CONSTRAINT "StrategicReview_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

