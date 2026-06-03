-- Career clusters and careers (admin-managed career guidance)

CREATE TABLE "CareerCluster" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerCluster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Career" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "overview" TEXT,
    "subjectsToFocus" TEXT,
    "recommendedCourses" TEXT,
    "collegesInstitutions" TEXT,
    "salaryExpectations" TEXT,
    "qualifications" TEXT,
    "careerProgression" TEXT,
    "additionalNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Career_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerCluster_schoolId_name_key" ON "CareerCluster"("schoolId", "name");
CREATE INDEX "CareerCluster_schoolId_idx" ON "CareerCluster"("schoolId");
CREATE INDEX "CareerCluster_schoolId_active_idx" ON "CareerCluster"("schoolId", "active");

CREATE UNIQUE INDEX "Career_schoolId_clusterId_title_key" ON "Career"("schoolId", "clusterId", "title");
CREATE INDEX "Career_schoolId_idx" ON "Career"("schoolId");
CREATE INDEX "Career_clusterId_idx" ON "Career"("clusterId");
CREATE INDEX "Career_schoolId_active_idx" ON "Career"("schoolId", "active");

ALTER TABLE "CareerCluster" ADD CONSTRAINT "CareerCluster_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Career" ADD CONSTRAINT "Career_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Career" ADD CONSTRAINT "Career_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "CareerCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
