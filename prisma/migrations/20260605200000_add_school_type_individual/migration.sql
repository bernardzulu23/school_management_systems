-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('SCHOOL', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "School" ADD COLUMN "schoolType" "SchoolType" NOT NULL DEFAULT 'SCHOOL';
ALTER TABLE "School" ADD COLUMN "enrollmentCode" TEXT;
ALTER TABLE "School" ADD COLUMN "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "SchoolRegistration" ADD COLUMN "schoolType" TEXT DEFAULT 'SCHOOL';
ALTER TABLE "SchoolRegistration" ADD COLUMN "accountType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "School_enrollmentCode_key" ON "School"("enrollmentCode");
