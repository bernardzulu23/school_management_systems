-- CreateTable
CREATE TABLE "TimetableDraftMeta" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "conflictErrors" INTEGER NOT NULL DEFAULT 0,
    "conflictWarnings" INTEGER NOT NULL DEFAULT 0,
    "conflictSummary" JSONB,
    "lastScannedAt" TIMESTAMP(3),
    "canPublish" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableDraftMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableDraftMeta_schoolId_idx" ON "TimetableDraftMeta"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableDraftMeta_schoolId_term_academicYear_key" ON "TimetableDraftMeta"("schoolId", "term", "academicYear");

-- AddForeignKey
ALTER TABLE "TimetableDraftMeta" ADD CONSTRAINT "TimetableDraftMeta_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
