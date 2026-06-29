-- Guidance Teacher Phase 2: cases, safeguarding, re-entry, career resources

ALTER TABLE "GuidanceAssignment" ADD COLUMN "canManageReEntry" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "CaseCategory" AS ENUM ('CAREER', 'ACADEMIC', 'PERSONAL_SOCIAL', 'HEALTH_WELFARE');
CREATE TYPE "ConfidentialityTier" AS ENUM ('STANDARD', 'SENSITIVE', 'SAFEGUARDING');
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CLOSED', 'REFERRED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'CANCELLED');
CREATE TYPE "GuidanceResourceType" AS ENUM ('BURSARY', 'INSTITUTION_INFO', 'CAREER_DAY');
CREATE TYPE "CaseAccessAction" AS ENUM ('VIEW', 'EDIT', 'LOG_ENTRY', 'REFERRAL', 'ESCALATE');

CREATE TABLE "GuidanceCase" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "category" "CaseCategory" NOT NULL,
    "confidentiality" "ConfidentialityTier" NOT NULL DEFAULT 'STANDARD',
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "legalBasis" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "assignedToId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,

    CONSTRAINT "GuidanceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseLogEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionTaken" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "loggedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseLogEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "referredTo" TEXT NOT NULL,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentObtained" BOOLEAN NOT NULL DEFAULT false,
    "consentByGuardianId" TEXT,
    "consentNotes" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafeguardingEscalation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "escalatedToId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "SafeguardingEscalation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseAccessLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "CaseAccessAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GirlsReEntryRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "withdrawalDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "supportPlan" TEXT,
    "consentGuardian" BOOLEAN NOT NULL DEFAULT false,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GirlsReEntryRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerResource" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "GuidanceResourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "postedById" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuidanceCase_schoolId_status_idx" ON "GuidanceCase"("schoolId", "status");
CREATE INDEX "GuidanceCase_schoolId_pupilId_idx" ON "GuidanceCase"("schoolId", "pupilId");
CREATE INDEX "GuidanceCase_schoolId_category_idx" ON "GuidanceCase"("schoolId", "category");
CREATE INDEX "GuidanceCase_assignedToId_idx" ON "GuidanceCase"("assignedToId");

CREATE INDEX "CaseLogEntry_schoolId_idx" ON "CaseLogEntry"("schoolId");
CREATE INDEX "CaseLogEntry_caseId_date_idx" ON "CaseLogEntry"("caseId", "date");

CREATE INDEX "ReferralRecord_schoolId_idx" ON "ReferralRecord"("schoolId");
CREATE INDEX "ReferralRecord_caseId_idx" ON "ReferralRecord"("caseId");

CREATE UNIQUE INDEX "SafeguardingEscalation_caseId_key" ON "SafeguardingEscalation"("caseId");
CREATE INDEX "SafeguardingEscalation_schoolId_idx" ON "SafeguardingEscalation"("schoolId");
CREATE INDEX "SafeguardingEscalation_escalatedToId_acknowledgedAt_idx" ON "SafeguardingEscalation"("escalatedToId", "acknowledgedAt");

CREATE INDEX "CaseAccessLog_schoolId_idx" ON "CaseAccessLog"("schoolId");
CREATE INDEX "CaseAccessLog_caseId_timestamp_idx" ON "CaseAccessLog"("caseId", "timestamp");
CREATE INDEX "CaseAccessLog_userId_idx" ON "CaseAccessLog"("userId");

CREATE UNIQUE INDEX "GirlsReEntryRecord_caseId_key" ON "GirlsReEntryRecord"("caseId");
CREATE INDEX "GirlsReEntryRecord_schoolId_idx" ON "GirlsReEntryRecord"("schoolId");
CREATE INDEX "GirlsReEntryRecord_pupilId_idx" ON "GirlsReEntryRecord"("pupilId");

CREATE INDEX "CareerResource_schoolId_active_idx" ON "CareerResource"("schoolId", "active");
CREATE INDEX "CareerResource_schoolId_type_idx" ON "CareerResource"("schoolId", "type");

ALTER TABLE "GuidanceCase" ADD CONSTRAINT "GuidanceCase_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceCase" ADD CONSTRAINT "GuidanceCase_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceCase" ADD CONSTRAINT "GuidanceCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceCase" ADD CONSTRAINT "GuidanceCase_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseLogEntry" ADD CONSTRAINT "CaseLogEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuidanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseLogEntry" ADD CONSTRAINT "CaseLogEntry_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralRecord" ADD CONSTRAINT "ReferralRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuidanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SafeguardingEscalation" ADD CONSTRAINT "SafeguardingEscalation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuidanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafeguardingEscalation" ADD CONSTRAINT "SafeguardingEscalation_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseAccessLog" ADD CONSTRAINT "CaseAccessLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuidanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseAccessLog" ADD CONSTRAINT "CaseAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GirlsReEntryRecord" ADD CONSTRAINT "GirlsReEntryRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GirlsReEntryRecord" ADD CONSTRAINT "GirlsReEntryRecord_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GirlsReEntryRecord" ADD CONSTRAINT "GirlsReEntryRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuidanceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CareerResource" ADD CONSTRAINT "CareerResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerResource" ADD CONSTRAINT "CareerResource_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
