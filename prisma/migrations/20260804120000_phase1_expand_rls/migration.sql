-- Phase 1 defense-in-depth: expand PostgreSQL RLS on tenant-owned tables (schoolId).
-- Companion to app SET via lib/db/school-context.js (app.current_school_id).
--
-- IMPORTANT before migrate deploy:
-- 1. Tenant API paths that touch these tables must call withSchoolContext / withTenantRequest
--    (or SET app.current_school_id) or queries return zero rows under FORCE RLS.
-- 2. Auth user lookup (resolveAuthenticatedSchoolId) sets GUC from JWT schoolId hint, then
--    verifies against DB — see lib/tenant/resolveSchoolId.js.
-- 3. USSD / cron / platform jobs: use runAsPlatform only for non-RLS paths, or SET GUC
--    for a single schoolId inside withSchoolContext.
-- 4. table owner normally bypasses RLS unless FORCE — this migration uses FORCE so Neon
--    app role cannot read cross-tenant rows even as owner.

CREATE OR REPLACE FUNCTION app_current_school_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_school_id', true), '');
$$ LANGUAGE sql STABLE;

-- Generic helper: enable FORCE RLS + tenant policy on a table with "schoolId" text column.
-- (Idempotent DROP/CREATE policy names.)

-- User: ENABLE RLS but do NOT FORCE.
-- Neon app role typically owns tables and bypasses RLS unless FORCE is set.
-- Login / resolveAuthenticatedSchoolId must read User by id before school context exists
-- (chicken-and-egg). Tenant isolation for User relies on Prisma getTenantClient +
-- DB SoT checks; optional: migrate auth lookup to SECURITY DEFINER before FORCE.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_tenant ON "User";
CREATE POLICY user_tenant ON "User"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_tenant ON "Teacher";
CREATE POLICY teacher_tenant ON "Teacher"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_tenant ON "Class";
CREATE POLICY class_tenant ON "Class"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "AttendanceMark" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceMark" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_mark_tenant ON "AttendanceMark";
CREATE POLICY attendance_mark_tenant ON "AttendanceMark"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "AttendanceSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceSession" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_session_tenant ON "AttendanceSession";
CREATE POLICY attendance_session_tenant ON "AttendanceSession"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "SchoolFeePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolFeePayment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_fee_payment_tenant ON "SchoolFeePayment";
CREATE POLICY school_fee_payment_tenant ON "SchoolFeePayment"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "ParentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_profile_tenant ON "ParentProfile";
CREATE POLICY parent_profile_tenant ON "ParentProfile"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "ParentStudentLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentStudentLink" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_student_link_tenant ON "ParentStudentLink";
CREATE POLICY parent_student_link_tenant ON "ParentStudentLink"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consent_record_tenant ON "ConsentRecord";
CREATE POLICY consent_record_tenant ON "ConsentRecord"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "SchoolMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolMaterial" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_material_tenant ON "SchoolMaterial";
CREATE POLICY school_material_tenant ON "SchoolMaterial"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "MaterialChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialChunk" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_chunk_tenant ON "MaterialChunk";
CREATE POLICY material_chunk_tenant ON "MaterialChunk"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "TimetableAllocationEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimetableAllocationEntry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timetable_alloc_entry_tenant ON "TimetableAllocationEntry";
CREATE POLICY timetable_alloc_entry_tenant ON "TimetableAllocationEntry"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "TimetableEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimetableEntry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timetable_entry_tenant ON "TimetableEntry";
CREATE POLICY timetable_entry_tenant ON "TimetableEntry"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "SmsBroadcast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SmsBroadcast" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_broadcast_tenant ON "SmsBroadcast";
CREATE POLICY sms_broadcast_tenant ON "SmsBroadcast"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

ALTER TABLE "SmsQueueItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SmsQueueItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_queue_item_tenant ON "SmsQueueItem";
CREATE POLICY sms_queue_item_tenant ON "SmsQueueItem"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

-- SmsLog.schoolId is nullable (platform/gateway noise). Row visible only when schoolId
-- matches the session tenant; NULL schoolId rows are never visible under FORCE RLS
-- (insert platform logs via a BYPASSRLS role or SET then insert with schoolId).
ALTER TABLE "SmsLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SmsLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_log_tenant ON "SmsLog";
CREATE POLICY sms_log_tenant ON "SmsLog"
  USING ("schoolId" IS NOT NULL AND "schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" IS NOT NULL AND "schoolId" = app_current_school_id());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_tenant ON "AuditLog";
CREATE POLICY audit_log_tenant ON "AuditLog"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());

-- Indexes: confirm / add schoolId indexes used by RLS predicates + app filters.
CREATE INDEX IF NOT EXISTS "User_schoolId_idx" ON "User"("schoolId");
CREATE INDEX IF NOT EXISTS "Teacher_schoolId_idx" ON "Teacher"("schoolId");
CREATE INDEX IF NOT EXISTS "Class_schoolId_idx" ON "Class"("schoolId");
CREATE INDEX IF NOT EXISTS "AttendanceMark_schoolId_studentId_idx" ON "AttendanceMark"("schoolId", "studentId");
CREATE INDEX IF NOT EXISTS "AttendanceSession_schoolId_startedAt_idx" ON "AttendanceSession"("schoolId", "startedAt");
CREATE INDEX IF NOT EXISTS "SchoolFeePayment_schoolId_idx" ON "SchoolFeePayment"("schoolId");
CREATE INDEX IF NOT EXISTS "ParentProfile_schoolId_idx" ON "ParentProfile"("schoolId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_schoolId_status_idx" ON "ParentStudentLink"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "ConsentRecord_schoolId_pupilId_consentType_idx" ON "ConsentRecord"("schoolId", "pupilId", "consentType");
CREATE INDEX IF NOT EXISTS "SchoolMaterial_schoolId_idx" ON "SchoolMaterial"("schoolId");
CREATE INDEX IF NOT EXISTS "MaterialChunk_schoolId_idx" ON "MaterialChunk"("schoolId");
CREATE INDEX IF NOT EXISTS "TimetableAllocationEntry_schoolId_status_idx" ON "TimetableAllocationEntry"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "TimetableEntry_schoolId_idx" ON "TimetableEntry"("schoolId");
CREATE INDEX IF NOT EXISTS "SmsBroadcast_schoolId_idx" ON "SmsBroadcast"("schoolId");
CREATE INDEX IF NOT EXISTS "SmsQueueItem_schoolId_idx" ON "SmsQueueItem"("schoolId");
CREATE INDEX IF NOT EXISTS "SmsLog_schoolId_createdAt_idx" ON "SmsLog"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_idx" ON "AuditLog"("schoolId");

-- Student / Attendance / Result / EczAssessmentScore / TermReport already FORCE RLS’d in
-- 20260528120000_enable_rls. Ensure Student schoolId index exists for RLS.
CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");
CREATE INDEX IF NOT EXISTS "Attendance_schoolId_idx" ON "Attendance"("schoolId");
CREATE INDEX IF NOT EXISTS "Result_schoolId_idx" ON "Result"("schoolId");

-- USSD / webhooks: discover candidate tenants by guardian phone without disabling RLS.
-- SECURITY DEFINER runs as owner; returns only distinct schoolIds (not student PII).
CREATE OR REPLACE FUNCTION ussd_candidate_school_ids(phone_tail text)
RETURNS TABLE(school_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s."schoolId"
  FROM "Student" s
  WHERE length(COALESCE(phone_tail, '')) >= 7
    AND (
      s.parent_father_contact LIKE '%' || phone_tail || '%'
      OR s.parent_mother_contact LIKE '%' || phone_tail || '%'
      OR s.guardian_contact LIKE '%' || phone_tail || '%'
    )
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION ussd_candidate_school_ids(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ussd_candidate_school_ids(text) TO PUBLIC;
