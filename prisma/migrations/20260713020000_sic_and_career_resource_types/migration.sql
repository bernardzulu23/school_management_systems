-- AlterEnum GuidanceResourceType
ALTER TYPE "GuidanceResourceType" ADD VALUE 'SUBJECT_FOCUS';
ALTER TYPE "GuidanceResourceType" ADD VALUE 'UNIVERSITY_PROGRAM';

-- CreateEnum
CREATE TYPE "SicCpdPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'INACTIVE');

-- CreateTable SicAssignment
CREATE TABLE "SicAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "SicAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SicAssignment_userId_key" ON "SicAssignment"("userId");
CREATE INDEX "SicAssignment_schoolId_active_idx" ON "SicAssignment"("schoolId", "active");
CREATE INDEX "SicAssignment_userId_active_idx" ON "SicAssignment"("userId", "active");

ALTER TABLE "SicAssignment" ADD CONSTRAINT "SicAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicAssignment" ADD CONSTRAINT "SicAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicAssignment" ADD CONSTRAINT "SicAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable SicCpdPlan
CREATE TABLE "SicCpdPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "SicCpdPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "minutes" TEXT,
    "minutesSubmittedAt" TIMESTAMP(3),
    "minutesDueAt" TIMESTAMP(3),
    "inactiveAt" TIMESTAMP(3),
    "inactiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SicCpdPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SicCpdPlan_schoolId_status_idx" ON "SicCpdPlan"("schoolId", "status");
CREATE INDEX "SicCpdPlan_schoolId_departmentId_idx" ON "SicCpdPlan"("schoolId", "departmentId");
CREATE INDEX "SicCpdPlan_schoolId_meetingDate_idx" ON "SicCpdPlan"("schoolId", "meetingDate");
CREATE INDEX "SicCpdPlan_departmentId_status_idx" ON "SicCpdPlan"("departmentId", "status");

ALTER TABLE "SicCpdPlan" ADD CONSTRAINT "SicCpdPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicCpdPlan" ADD CONSTRAINT "SicCpdPlan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicCpdPlan" ADD CONSTRAINT "SicCpdPlan_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicCpdPlan" ADD CONSTRAINT "SicCpdPlan_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable SicActivityPlan
CREATE TABLE "SicActivityPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SicActivityPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SicActivityPlan_schoolId_createdAt_idx" ON "SicActivityPlan"("schoolId", "createdAt");
ALTER TABLE "SicActivityPlan" ADD CONSTRAINT "SicActivityPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicActivityPlan" ADD CONSTRAINT "SicActivityPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable SicHimMeeting
CREATE TABLE "SicHimMeeting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT,
    "minutes" TEXT,
    "minutesSubmittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SicHimMeeting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SicHimMeeting_schoolId_meetingDate_idx" ON "SicHimMeeting"("schoolId", "meetingDate");
CREATE INDEX "SicHimMeeting_schoolId_status_idx" ON "SicHimMeeting"("schoolId", "status");
ALTER TABLE "SicHimMeeting" ADD CONSTRAINT "SicHimMeeting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicHimMeeting" ADD CONSTRAINT "SicHimMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable SicDepartmentStatus
CREATE TABLE "SicDepartmentStatus" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "inactive" BOOLEAN NOT NULL DEFAULT false,
    "inactiveAt" TIMESTAMP(3),
    "reason" TEXT,
    "relatedPlanId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SicDepartmentStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SicDepartmentStatus_schoolId_departmentId_key" ON "SicDepartmentStatus"("schoolId", "departmentId");
CREATE INDEX "SicDepartmentStatus_schoolId_inactive_idx" ON "SicDepartmentStatus"("schoolId", "inactive");
ALTER TABLE "SicDepartmentStatus" ADD CONSTRAINT "SicDepartmentStatus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SicDepartmentStatus" ADD CONSTRAINT "SicDepartmentStatus_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
