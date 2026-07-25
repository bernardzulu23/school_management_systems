-- CreateEnum
CREATE TYPE "SyllabusVersion" AS ENUM ('OLD_SYLLABUS', 'CBC');

-- CreateTable
CREATE TABLE "CurriculumRollout" (
    "id" TEXT NOT NULL,
    "canonicalLevel" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "syllabusVersion" "SyllabusVersion" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumRollout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OldSyllabusDocument" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'O-LEVEL',
    "sourcePublisher" TEXT,
    "sourceYear" INTEGER,
    "sourceIsbn" TEXT,
    "timeAllocation" JSONB,
    "domains" TEXT[],
    "contentJson" JSONB NOT NULL,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestedFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OldSyllabusDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaper" (
    "id" TEXT NOT NULL,
    "syllabusVersion" "SyllabusVersion" NOT NULL,
    "subject" TEXT NOT NULL,
    "examBoard" TEXT NOT NULL DEFAULT 'ECZ',
    "paperCode" TEXT NOT NULL,
    "paperNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "calculatorAllowed" BOOLEAN NOT NULL,
    "formulaSheetProvided" BOOLEAN NOT NULL DEFAULT false,
    "roundingRule" TEXT,
    "structureJson" JSONB NOT NULL,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestedFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurriculumRollout_canonicalLevel_academicYear_idx" ON "CurriculumRollout"("canonicalLevel", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumRollout_canonicalLevel_academicYear_key" ON "CurriculumRollout"("canonicalLevel", "academicYear");

-- CreateIndex
CREATE INDEX "OldSyllabusDocument_subject_level_idx" ON "OldSyllabusDocument"("subject", "level");

-- CreateIndex
CREATE INDEX "OldSyllabusDocument_validationStatus_idx" ON "OldSyllabusDocument"("validationStatus");

-- CreateIndex
CREATE INDEX "PastPaper_subject_syllabusVersion_paperNumber_idx" ON "PastPaper"("subject", "syllabusVersion", "paperNumber");

-- CreateIndex
CREATE INDEX "PastPaper_validationStatus_idx" ON "PastPaper"("validationStatus");
