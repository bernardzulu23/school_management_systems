-- Teaching Hub: scheme week progress, topic mastery, test schedules, teacher performance

CREATE TABLE IF NOT EXISTS "SchemeProgress" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "topicName" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchemeProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchemeProgress_schemeId_weekNumber_key" ON "SchemeProgress"("schemeId", "weekNumber");
CREATE INDEX IF NOT EXISTS "SchemeProgress_schoolId_teacherId_idx" ON "SchemeProgress"("schoolId", "teacherId");
CREATE INDEX IF NOT EXISTS "SchemeProgress_schoolId_schemeId_idx" ON "SchemeProgress"("schoolId", "schemeId");

CREATE TABLE IF NOT EXISTS "TopicMastery" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "averageMasteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "assessmentCount" INTEGER NOT NULL DEFAULT 0,
    "needsReteaching" BOOLEAN NOT NULL DEFAULT false,
    "lastAssessedAt" TIMESTAMP(3),
    "schemeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopicMastery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TopicMastery_schoolId_classId_topicName_key" ON "TopicMastery"("schoolId", "classId", "topicName");
CREATE INDEX IF NOT EXISTS "TopicMastery_schoolId_teacherId_idx" ON "TopicMastery"("schoolId", "teacherId");
CREATE INDEX IF NOT EXISTS "TopicMastery_needsReteaching_idx" ON "TopicMastery"("needsReteaching");

CREATE TABLE IF NOT EXISTS "SchemeTestSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "midTermWeek" INTEGER,
    "endOfTermWeek" INTEGER,
    "midTermDate" TIMESTAMP(3),
    "endOfTermDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchemeTestSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchemeTestSchedule_schemeId_key" ON "SchemeTestSchedule"("schemeId");
CREATE INDEX IF NOT EXISTS "SchemeTestSchedule_schoolId_teacherId_idx" ON "SchemeTestSchedule"("schoolId", "teacherId");

CREATE TABLE IF NOT EXISTS "TeacherPerformanceSummary" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageMasteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topicsNeedingReteach" INTEGER NOT NULL DEFAULT 0,
    "totalSchemesAssigned" INTEGER NOT NULL DEFAULT 0,
    "totalWeeksPlanned" INTEGER NOT NULL DEFAULT 0,
    "totalWeeksCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherPerformanceSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPerformanceSummary_schoolId_teacherId_term_academicYear_key"
  ON "TeacherPerformanceSummary"("schoolId", "teacherId", "term", "academicYear");
CREATE INDEX IF NOT EXISTS "TeacherPerformanceSummary_schoolId_term_academicYear_idx"
  ON "TeacherPerformanceSummary"("schoolId", "term", "academicYear");

ALTER TABLE "SchemeProgress"
  ADD CONSTRAINT "SchemeProgress_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeProgress"
  ADD CONSTRAINT "SchemeProgress_schemeId_fkey"
  FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeProgress"
  ADD CONSTRAINT "SchemeProgress_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TopicMastery"
  ADD CONSTRAINT "TopicMastery_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicMastery"
  ADD CONSTRAINT "TopicMastery_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicMastery"
  ADD CONSTRAINT "TopicMastery_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchemeTestSchedule"
  ADD CONSTRAINT "SchemeTestSchedule_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeTestSchedule"
  ADD CONSTRAINT "SchemeTestSchedule_schemeId_fkey"
  FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeTestSchedule"
  ADD CONSTRAINT "SchemeTestSchedule_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherPerformanceSummary"
  ADD CONSTRAINT "TeacherPerformanceSummary_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPerformanceSummary"
  ADD CONSTRAINT "TeacherPerformanceSummary_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
