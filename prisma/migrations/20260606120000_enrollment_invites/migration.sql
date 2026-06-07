-- CreateTable
CREATE TABLE "EnrollmentInvite" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentInvite_code_key" ON "EnrollmentInvite"("code");

-- CreateIndex
CREATE INDEX "EnrollmentInvite_schoolId_idx" ON "EnrollmentInvite"("schoolId");

-- CreateIndex
CREATE INDEX "EnrollmentInvite_schoolId_usedAt_idx" ON "EnrollmentInvite"("schoolId", "usedAt");

-- AddForeignKey
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill unused invites for existing individual workspaces
INSERT INTO "EnrollmentInvite" ("id", "schoolId", "code", "createdAt")
SELECT gen_random_uuid()::text, s."id", s."enrollmentCode", NOW()
FROM "School" s
WHERE s."enrollmentCode" IS NOT NULL
  AND s."schoolType" = 'INDIVIDUAL'
  AND NOT EXISTS (
    SELECT 1 FROM "EnrollmentInvite" ei WHERE ei."code" = s."enrollmentCode"
  );
