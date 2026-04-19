-- CreateEnum
CREATE TYPE "ConstraintType" AS ENUM ('HARD', 'SOFT');

-- CreateEnum
CREATE TYPE "ConstraintScope" AS ENUM ('TEACHER', 'CLASS', 'ROOM', 'SCHOOL');

-- CreateEnum
CREATE TYPE "SubstitutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimetableVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "logo_url" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "qualifications" TEXT,
ADD COLUMN     "ts_number" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "breakName" TEXT,
    "breakDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableVersion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "TimetableVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "generationStatus" TEXT DEFAULT 'NOT_STARTED',
    "seasonId" TEXT,
    "season" TEXT,
    "solverScore" DOUBLE PRECISION,
    "solverStats" JSONB,
    "periodAssignmentsLocked" INTEGER,
    "totalPeriodsNeeded" INTEGER,
    "name" TEXT,
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "teacherId" TEXT,
    "classId" TEXT,
    "subjectId" TEXT,
    "teachingAssignmentId" TEXT,
    "classroomId" TEXT,
    "isLockedPeriodAssignment" BOOLEAN NOT NULL DEFAULT false,
    "solvedByAlgorithm" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPeriodAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "lockedForGeneration" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPeriodAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constraint" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "ConstraintType" NOT NULL,
    "scope" "ConstraintScope" NOT NULL,
    "targetId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substitution" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotId" TEXT NOT NULL,
    "originalTeacherId" TEXT NOT NULL,
    "coverTeacherId" TEXT NOT NULL,
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Substitution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classroom_schoolId_idx" ON "Classroom"("schoolId");

-- CreateIndex
CREATE INDEX "Classroom_name_idx" ON "Classroom"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_schoolId_name_key" ON "Classroom"("schoolId", "name");

-- CreateIndex
CREATE INDEX "TimeSlot_schoolId_idx" ON "TimeSlot"("schoolId");

-- CreateIndex
CREATE INDEX "TimeSlot_schoolId_dayOfWeek_period_idx" ON "TimeSlot"("schoolId", "dayOfWeek", "period");

-- CreateIndex
CREATE INDEX "TimetableVersion_schoolId_idx" ON "TimetableVersion"("schoolId");

-- CreateIndex
CREATE INDEX "TimetableVersion_schoolId_status_idx" ON "TimetableVersion"("schoolId", "status");

-- CreateIndex
CREATE INDEX "TimetableVersion_createdByUserId_idx" ON "TimetableVersion"("createdByUserId");

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_idx" ON "TimetableEntry"("schoolId");

-- CreateIndex
CREATE INDEX "TimetableEntry_versionId_idx" ON "TimetableEntry"("versionId");

-- CreateIndex
CREATE INDEX "TimetableEntry_teacherId_idx" ON "TimetableEntry"("teacherId");

-- CreateIndex
CREATE INDEX "TimetableEntry_classId_idx" ON "TimetableEntry"("classId");

-- CreateIndex
CREATE INDEX "TimetableEntry_subjectId_idx" ON "TimetableEntry"("subjectId");

-- CreateIndex
CREATE INDEX "TimetableEntry_teachingAssignmentId_idx" ON "TimetableEntry"("teachingAssignmentId");

-- CreateIndex
CREATE INDEX "TimetableEntry_timeSlotId_idx" ON "TimetableEntry"("timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_versionId_timeSlotId_teacherId_key" ON "TimetableEntry"("versionId", "timeSlotId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_versionId_timeSlotId_classId_key" ON "TimetableEntry"("versionId", "timeSlotId", "classId");

-- CreateIndex
CREATE INDEX "TeacherPeriodAssignment_schoolId_idx" ON "TeacherPeriodAssignment"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherPeriodAssignment_teacherId_idx" ON "TeacherPeriodAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherPeriodAssignment_timeSlotId_idx" ON "TeacherPeriodAssignment"("timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPeriodAssignment_schoolId_teacherId_timeSlotId_key" ON "TeacherPeriodAssignment"("schoolId", "teacherId", "timeSlotId");

-- CreateIndex
CREATE INDEX "Constraint_schoolId_idx" ON "Constraint"("schoolId");

-- CreateIndex
CREATE INDEX "Constraint_schoolId_type_idx" ON "Constraint"("schoolId", "type");

-- CreateIndex
CREATE INDEX "Constraint_schoolId_scope_idx" ON "Constraint"("schoolId", "scope");

-- CreateIndex
CREATE INDEX "Constraint_targetId_idx" ON "Constraint"("targetId");

-- CreateIndex
CREATE INDEX "Substitution_schoolId_idx" ON "Substitution"("schoolId");

-- CreateIndex
CREATE INDEX "Substitution_schoolId_date_idx" ON "Substitution"("schoolId", "date");

-- CreateIndex
CREATE INDEX "Substitution_originalTeacherId_idx" ON "Substitution"("originalTeacherId");

-- CreateIndex
CREATE INDEX "Substitution_coverTeacherId_idx" ON "Substitution"("coverTeacherId");

-- CreateIndex
CREATE INDEX "Substitution_slotId_idx" ON "Substitution"("slotId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Activity_date_idx" ON "Activity"("date");

-- CreateIndex
CREATE INDEX "Assessment_subject_idx" ON "Assessment"("subject");

-- CreateIndex
CREATE INDEX "Assessment_class_idx" ON "Assessment"("class");

-- CreateIndex
CREATE INDEX "Assessment_date_idx" ON "Assessment"("date");

-- CreateIndex
CREATE INDEX "Class_year_group_idx" ON "Class"("year_group");

-- CreateIndex
CREATE INDEX "Game_subject_idx" ON "Game"("subject");

-- CreateIndex
CREATE INDEX "Game_type_idx" ON "Game"("type");

-- CreateIndex
CREATE INDEX "GamificationProfile_points_idx" ON "GamificationProfile"("points");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "HeadOfDepartment_department_idx" ON "HeadOfDepartment"("department");

-- CreateIndex
CREATE INDEX "Result_subjectId_idx" ON "Result"("subjectId");

-- CreateIndex
CREATE INDEX "Result_score_idx" ON "Result"("score");

-- CreateIndex
CREATE INDEX "Student_name_idx" ON "Student"("name");

-- CreateIndex
CREATE INDEX "Student_grade_average_idx" ON "Student"("grade_average");

-- CreateIndex
CREATE INDEX "StudentWork_type_idx" ON "StudentWork"("type");

-- CreateIndex
CREATE INDEX "StudentWork_createdAt_idx" ON "StudentWork"("createdAt");

-- CreateIndex
CREATE INDEX "Subject_name_idx" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Teacher_department_idx" ON "Teacher"("department");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableVersion" ADD CONSTRAINT "TimetableVersion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableVersion" ADD CONSTRAINT "TimetableVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "TimetableVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPeriodAssignment" ADD CONSTRAINT "TeacherPeriodAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPeriodAssignment" ADD CONSTRAINT "TeacherPeriodAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPeriodAssignment" ADD CONSTRAINT "TeacherPeriodAssignment_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_coverTeacherId_fkey" FOREIGN KEY ("coverTeacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
