-- Parent portal: ParentProfile + ParentStudentLink
CREATE TABLE IF NOT EXISTS "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "phone" TEXT,
    "preferredContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE INDEX IF NOT EXISTS "ParentProfile_schoolId_idx" ON "ParentProfile"("schoolId");

CREATE TABLE IF NOT EXISTS "ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inviteToken" TEXT,
    "inviteEmail" TEXT,
    "invitePhone" TEXT,
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudentLink_inviteToken_key" ON "ParentStudentLink"("inviteToken");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudentLink_parentUserId_studentId_key" ON "ParentStudentLink"("parentUserId", "studentId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_studentId_schoolId_idx" ON "ParentStudentLink"("studentId", "schoolId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_schoolId_status_idx" ON "ParentStudentLink"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_inviteEmail_schoolId_idx" ON "ParentStudentLink"("inviteEmail", "schoolId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_parentUserId_schoolId_idx" ON "ParentStudentLink"("parentUserId", "schoolId");

DO $$ BEGIN
  ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentUserId_fkey"
    FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
