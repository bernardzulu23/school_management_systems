-- CreateEnum
CREATE TYPE "InnovationProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "InnovationProject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "labType" TEXT,
    "methodology" TEXT,
    "status" "InnovationProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "teamMembers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InnovationProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InnovationProject_schoolId_idx" ON "InnovationProject"("schoolId");

-- CreateIndex
CREATE INDEX "InnovationProject_createdBy_idx" ON "InnovationProject"("createdBy");

-- CreateIndex
CREATE INDEX "InnovationProject_status_idx" ON "InnovationProject"("status");

-- AddForeignKey
ALTER TABLE "InnovationProject" ADD CONSTRAINT "InnovationProject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
