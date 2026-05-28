-- Phase 3 P3.1: Row-Level Security for multi-tenant isolation (Neon PostgreSQL).
-- Application must SET app.current_school_id per transaction via lib/db/school-context.js
-- Platform admin / migrations use a role that bypasses RLS or unset context carefully.

CREATE OR REPLACE FUNCTION app_current_school_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_school_id', true), '');
$$ LANGUAGE sql STABLE;

-- Student
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_tenant ON "Student";
CREATE POLICY student_tenant ON "Student"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

-- Attendance (daily register)
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_tenant ON "Attendance";
CREATE POLICY attendance_tenant ON "Attendance"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

-- Results
ALTER TABLE "Result" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Result" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS result_tenant ON "Result";
CREATE POLICY result_tenant ON "Result"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

-- EczAssessmentScore
ALTER TABLE "EczAssessmentScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EczAssessmentScore" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ecz_score_tenant ON "EczAssessmentScore";
CREATE POLICY ecz_score_tenant ON "EczAssessmentScore"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

-- TermReport (Phase 3)
CREATE TABLE IF NOT EXISTS "TermReport" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "term" INTEGER NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "classId" TEXT,
  "content" JSONB NOT NULL,
  "narrative" TEXT,
  "attendancePct" DOUBLE PRECISION,
  "sbaAverage" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "generatedById" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TermReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TermReport_schoolId_studentId_term_academicYear_key"
  ON "TermReport"("schoolId", "studentId", "term", "academicYear");
CREATE INDEX IF NOT EXISTS "TermReport_schoolId_status_idx" ON "TermReport"("schoolId", "status");

ALTER TABLE "TermReport" ADD CONSTRAINT "TermReport_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TermReport" ADD CONSTRAINT "TermReport_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TermReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TermReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS term_report_tenant ON "TermReport";
CREATE POLICY term_report_tenant ON "TermReport"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());
