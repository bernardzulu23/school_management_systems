CREATE TABLE "HodFile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'attachment',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HodFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HodFile_schoolId_idx" ON "HodFile"("schoolId");
CREATE INDEX "HodFile_schoolId_entityType_entityId_idx" ON "HodFile"("schoolId", "entityType", "entityId");
CREATE INDEX "HodFile_schoolId_departmentId_idx" ON "HodFile"("schoolId", "departmentId");

ALTER TABLE "HodFile" ADD CONSTRAINT "HodFile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
