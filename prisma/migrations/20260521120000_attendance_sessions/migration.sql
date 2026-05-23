-- AttendanceSession / AttendanceMark + Student twin fields

CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "AttendanceMarkStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');
CREATE TYPE "AttendanceVerificationMethod" AS ENUM ('FACE', 'FINGERPRINT', 'MANUAL', 'TWIN_OVERRIDE', 'COMMUNITY_TAP');

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "twinGroupId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "requiresSecondaryAuth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "secondaryAuthMethod" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pinHash" TEXT;

CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "term" INTEGER,
    "academicYear" TEXT,
    "periodLabel" TEXT,
    "shift" TEXT NOT NULL DEFAULT 'SINGLE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "verificationMethod" "AttendanceVerificationMethod" NOT NULL DEFAULT 'MANUAL',
    "lateAfterMinutes" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceMark" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AttendanceMarkStatus" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "AttendanceVerificationMethod" NOT NULL DEFAULT 'MANUAL',
    "faceMatchScore" DOUBLE PRECISION,
    "remarks" TEXT,

    CONSTRAINT "AttendanceMark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceMark_sessionId_studentId_key" ON "AttendanceMark"("sessionId", "studentId");
CREATE INDEX "AttendanceSession_schoolId_startedAt_idx" ON "AttendanceSession"("schoolId", "startedAt");
CREATE INDEX "AttendanceSession_teacherId_status_idx" ON "AttendanceSession"("teacherId", "status");
CREATE INDEX "AttendanceSession_classId_subjectId_idx" ON "AttendanceSession"("classId", "subjectId");
CREATE INDEX "AttendanceMark_schoolId_studentId_idx" ON "AttendanceMark"("schoolId", "studentId");
CREATE INDEX "AttendanceMark_sessionId_status_idx" ON "AttendanceMark"("sessionId", "status");

ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceMark" ADD CONSTRAINT "AttendanceMark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceMark" ADD CONSTRAINT "AttendanceMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceMark" ADD CONSTRAINT "AttendanceMark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
