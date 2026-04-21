-- CreateTable
CREATE TABLE "TeacherAllocation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "hodId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL,
    "blockType" TEXT NOT NULL,
    "singlePeriods" INTEGER NOT NULL DEFAULT 0,
    "doublePeriods" INTEGER NOT NULL DEFAULT 0,
    "triplePeriods" INTEGER NOT NULL DEFAULT 0,
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "academicYear" TEXT NOT NULL DEFAULT '2025',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pushedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableNotification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "department" TEXT,
    "term" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimetableNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '07:00',
    "endTime" TEXT NOT NULL DEFAULT '18:00',
    "singleDuration" INTEGER NOT NULL DEFAULT 40,
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "academicYear" TEXT NOT NULL DEFAULT '2025',
    "workingDays" TEXT[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::TEXT[],
    "breakSlots" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableAllocationEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableAllocationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAllocation_schoolId_idx" ON "TeacherAllocation"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherAllocation_schoolId_hodId_idx" ON "TeacherAllocation"("schoolId", "hodId");

-- CreateIndex
CREATE INDEX "TeacherAllocation_schoolId_teacherId_idx" ON "TeacherAllocation"("schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "TeacherAllocation_schoolId_status_idx" ON "TeacherAllocation"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAllocation_schoolId_teacherId_subjectId_classId_term_academicYear_key" ON "TeacherAllocation"("schoolId", "teacherId", "subjectId", "classId", "term", "academicYear");

-- CreateIndex
CREATE INDEX "TimetableNotification_schoolId_toUserId_read_idx" ON "TimetableNotification"("schoolId", "toUserId", "read");

-- CreateIndex
CREATE INDEX "TimetableNotification_schoolId_toUserId_idx" ON "TimetableNotification"("schoolId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableConfig_schoolId_key" ON "TimetableConfig"("schoolId");

-- CreateIndex
CREATE INDEX "TimetableAllocationEntry_schoolId_dayOfWeek_idx" ON "TimetableAllocationEntry"("schoolId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableAllocationEntry_schoolId_teacherId_dayOfWeek_idx" ON "TimetableAllocationEntry"("schoolId", "teacherId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableAllocationEntry_schoolId_classId_dayOfWeek_idx" ON "TimetableAllocationEntry"("schoolId", "classId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableAllocationEntry_schoolId_status_idx" ON "TimetableAllocationEntry"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableNotification" ADD CONSTRAINT "TimetableNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableNotification" ADD CONSTRAINT "TimetableNotification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableNotification" ADD CONSTRAINT "TimetableNotification_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableConfig" ADD CONSTRAINT "TimetableConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableAllocationEntry" ADD CONSTRAINT "TimetableAllocationEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableAllocationEntry" ADD CONSTRAINT "TimetableAllocationEntry_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "TeacherAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

