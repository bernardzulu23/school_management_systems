-- Guidance teacher role assignments (career & counselling scope)

CREATE TYPE "GuidanceScope" AS ENUM ('ALL', 'JUNIOR', 'SENIOR');

CREATE TABLE "GuidanceAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "GuidanceScope" NOT NULL DEFAULT 'ALL',
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GuidanceAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuidanceAssignment_userId_key" ON "GuidanceAssignment"("userId");
CREATE INDEX "GuidanceAssignment_schoolId_active_idx" ON "GuidanceAssignment"("schoolId", "active");
CREATE INDEX "GuidanceAssignment_userId_active_idx" ON "GuidanceAssignment"("userId", "active");

ALTER TABLE "GuidanceAssignment" ADD CONSTRAINT "GuidanceAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceAssignment" ADD CONSTRAINT "GuidanceAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceAssignment" ADD CONSTRAINT "GuidanceAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
