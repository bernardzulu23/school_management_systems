-- Senior teacher assignments for school-wide primary oversight

CREATE TABLE "SeniorTeacherAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeniorTeacherAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeniorTeacherAssignment_userId_key" ON "SeniorTeacherAssignment"("userId");
CREATE INDEX "SeniorTeacherAssignment_schoolId_active_idx" ON "SeniorTeacherAssignment"("schoolId", "active");
CREATE INDEX "SeniorTeacherAssignment_userId_active_idx" ON "SeniorTeacherAssignment"("userId", "active");

ALTER TABLE "SeniorTeacherAssignment"
ADD CONSTRAINT "SeniorTeacherAssignment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeniorTeacherAssignment"
ADD CONSTRAINT "SeniorTeacherAssignment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeniorTeacherAssignment"
ADD CONSTRAINT "SeniorTeacherAssignment_assignedById_fkey"
FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
