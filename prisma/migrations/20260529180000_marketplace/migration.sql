-- Teaching Materials Marketplace: cross-school sharing of lesson plans, SBA tasks, rubrics.

CREATE TABLE "SharedMaterial" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sourceLessonPlanId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "cbcCompetencies" JSONB,
    "resourceLevel" TEXT NOT NULL DEFAULT 'moderate',
    "tags" JSONB,
    "showAuthorName" BOOLEAN NOT NULL DEFAULT false,
    "province" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SharedMaterial_status_subject_form_type_idx"
ON "SharedMaterial"("status", "subject", "form", "type");

CREATE INDEX "SharedMaterial_schoolId_idx" ON "SharedMaterial"("schoolId");
CREATE INDEX "SharedMaterial_teacherId_idx" ON "SharedMaterial"("teacherId");
CREATE INDEX "SharedMaterial_status_createdAt_idx" ON "SharedMaterial"("status", "createdAt");

ALTER TABLE "SharedMaterial" ADD CONSTRAINT "SharedMaterial_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedMaterial" ADD CONSTRAINT "SharedMaterial_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MaterialRating" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaterialRating_materialId_teacherId_key"
ON "MaterialRating"("materialId", "teacherId");

CREATE INDEX "MaterialRating_materialId_idx" ON "MaterialRating"("materialId");

ALTER TABLE "MaterialRating" ADD CONSTRAINT "MaterialRating_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "SharedMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaterialRating" ADD CONSTRAINT "MaterialRating_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
