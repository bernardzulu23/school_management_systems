-- National Assessment Platform: ECZ-style mock examinations (Task 32).

CREATE TABLE "MockExamAttempt" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "examLevel" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "paper" JSONB NOT NULL,
    "answers" JSONB,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "awardedMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreBucket" INTEGER,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MockExamAttempt_schoolId_idx" ON "MockExamAttempt"("schoolId");
CREATE INDEX "MockExamAttempt_studentId_idx" ON "MockExamAttempt"("studentId");
CREATE INDEX "MockExamAttempt_subject_examLevel_status_idx"
    ON "MockExamAttempt"("subject", "examLevel", "status");
CREATE INDEX "MockExamAttempt_subject_examLevel_percentage_idx"
    ON "MockExamAttempt"("subject", "examLevel", "percentage");

ALTER TABLE "MockExamAttempt" ADD CONSTRAINT "MockExamAttempt_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamAttempt" ADD CONSTRAINT "MockExamAttempt_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: tenant isolation. National percentile aggregation runs
-- through the platform/migration role (RLS-exempt) so cross-school counts work
-- without exposing per-row tenant data to ordinary sessions.
ALTER TABLE "MockExamAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MockExamAttempt" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mock_exam_attempt_tenant ON "MockExamAttempt";
CREATE POLICY mock_exam_attempt_tenant ON "MockExamAttempt"
  USING ("schoolId" = app_current_school_id())
  WITH CHECK ("schoolId" = app_current_school_id());
