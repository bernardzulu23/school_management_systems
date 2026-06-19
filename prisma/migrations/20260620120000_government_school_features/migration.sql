-- Government school Phase 2: grants, leave, deployment
CREATE TABLE IF NOT EXISTS "SchoolGrant" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL,
    "amountReceived" DOUBLE PRECISION NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "pupilCount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GrantAllocation" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lineItem" TEXT NOT NULL,
    "budgeted" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receipts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherLeave" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysCount" INTEGER NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLeave_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherDeployment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "deployedFrom" TEXT,
    "deploymentDate" TIMESTAMP(3),
    "tsNumber" TEXT,
    "gradeLevel" TEXT,
    "qualification" TEXT,
    "subjectSpec" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherDeployment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherDeployment_teacherId_key" ON "TeacherDeployment"("teacherId");
CREATE INDEX IF NOT EXISTS "SchoolGrant_schoolId_academicYear_idx" ON "SchoolGrant"("schoolId", "academicYear");
CREATE INDEX IF NOT EXISTS "GrantAllocation_grantId_idx" ON "GrantAllocation"("grantId");
CREATE INDEX IF NOT EXISTS "GrantAllocation_schoolId_idx" ON "GrantAllocation"("schoolId");
CREATE INDEX IF NOT EXISTS "TeacherLeave_schoolId_teacherId_idx" ON "TeacherLeave"("schoolId", "teacherId");
CREATE INDEX IF NOT EXISTS "TeacherLeave_schoolId_startDate_idx" ON "TeacherLeave"("schoolId", "startDate");
CREATE INDEX IF NOT EXISTS "TeacherDeployment_schoolId_idx" ON "TeacherDeployment"("schoolId");

DO $$ BEGIN
  ALTER TABLE "SchoolGrant" ADD CONSTRAINT "SchoolGrant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "GrantAllocation" ADD CONSTRAINT "GrantAllocation_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "SchoolGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherLeave" ADD CONSTRAINT "TeacherLeave_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherLeave" ADD CONSTRAINT "TeacherLeave_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherDeployment" ADD CONSTRAINT "TeacherDeployment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherDeployment" ADD CONSTRAINT "TeacherDeployment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
