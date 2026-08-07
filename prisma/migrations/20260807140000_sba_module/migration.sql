-- CreateEnum
CREATE TYPE "SBAComponentType" AS ENUM ('COURSEWORK', 'PRACTICAL', 'PROJECT', 'ORAL', 'PORTFOLIO', 'TERM_TEST', 'OTHER');

-- CreateEnum
CREATE TYPE "SBARecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "SchoolPhase" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateTable
CREATE TABLE "SBASubjectPolicy" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "syllabusVersion" "SyllabusVersion" NOT NULL,
    "startsAtLevel" TEXT NOT NULL DEFAULT 'Form 2',
    "sourceDocument" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SBASubjectPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SBAComponentPolicy" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "componentType" "SBAComponentType" NOT NULL,
    "maxRawMark" INTEGER,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SBAComponentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SBARecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolPhase" "SchoolPhase" NOT NULL DEFAULT 'SECONDARY',
    "pupilId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "componentType" "SBAComponentType" NOT NULL,
    "term" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "rawMark" DOUBLE PRECISION,
    "maxRawMark" INTEGER,
    "status" "SBARecordStatus" NOT NULL DEFAULT 'DRAFT',
    "enteredById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SBARecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SBARecordEdit" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "previousMark" DOUBLE PRECISION,
    "newMark" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SBARecordEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SBASubjectPolicy_schoolId_idx" ON "SBASubjectPolicy"("schoolId");

-- CreateIndex
CREATE INDEX "SBASubjectPolicy_schoolId_isActive_idx" ON "SBASubjectPolicy"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "SBASubjectPolicy_subjectId_idx" ON "SBASubjectPolicy"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SBASubjectPolicy_schoolId_subjectId_syllabusVersion_key" ON "SBASubjectPolicy"("schoolId", "subjectId", "syllabusVersion");

-- CreateIndex
CREATE INDEX "SBAComponentPolicy_policyId_idx" ON "SBAComponentPolicy"("policyId");

-- CreateIndex
CREATE INDEX "SBAComponentPolicy_schoolId_idx" ON "SBAComponentPolicy"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SBAComponentPolicy_policyId_componentType_key" ON "SBAComponentPolicy"("policyId", "componentType");

-- CreateIndex
CREATE INDEX "SBARecord_schoolId_idx" ON "SBARecord"("schoolId");

-- CreateIndex
CREATE INDEX "SBARecord_schoolId_classId_subjectId_academicYear_term_idx" ON "SBARecord"("schoolId", "classId", "subjectId", "academicYear", "term");

-- CreateIndex
CREATE INDEX "SBARecord_pupilId_idx" ON "SBARecord"("pupilId");

-- CreateIndex
CREATE INDEX "SBARecord_status_idx" ON "SBARecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SBARecord_school_pupil_subject_class_comp_term_year_key" ON "SBARecord"("schoolId", "pupilId", "subjectId", "classId", "componentType", "term", "academicYear");

-- CreateIndex
CREATE INDEX "SBARecordEdit_recordId_idx" ON "SBARecordEdit"("recordId");

-- CreateIndex
CREATE INDEX "SBARecordEdit_editedById_idx" ON "SBARecordEdit"("editedById");

-- CreateIndex
CREATE INDEX "SBARecordEdit_schoolId_idx" ON "SBARecordEdit"("schoolId");

-- AddForeignKey
ALTER TABLE "SBASubjectPolicy" ADD CONSTRAINT "SBASubjectPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBASubjectPolicy" ADD CONSTRAINT "SBASubjectPolicy_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBAComponentPolicy" ADD CONSTRAINT "SBAComponentPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBAComponentPolicy" ADD CONSTRAINT "SBAComponentPolicy_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SBASubjectPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecord" ADD CONSTRAINT "SBARecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecord" ADD CONSTRAINT "SBARecord_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecord" ADD CONSTRAINT "SBARecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecord" ADD CONSTRAINT "SBARecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecord" ADD CONSTRAINT "SBARecord_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecord" ADD CONSTRAINT "SBARecord_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecordEdit" ADD CONSTRAINT "SBARecordEdit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecordEdit" ADD CONSTRAINT "SBARecordEdit_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SBARecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBARecordEdit" ADD CONSTRAINT "SBARecordEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
