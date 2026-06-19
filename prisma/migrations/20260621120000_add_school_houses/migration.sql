-- CreateTable
CREATE TABLE "SchoolHouse" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolHouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentHouseMembership" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentHouseMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolHouse_schoolId_idx" ON "SchoolHouse"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolHouse_schoolId_name_key" ON "SchoolHouse"("schoolId", "name");

-- CreateIndex
CREATE INDEX "StudentHouseMembership_schoolId_idx" ON "StudentHouseMembership"("schoolId");

-- CreateIndex
CREATE INDEX "StudentHouseMembership_houseId_idx" ON "StudentHouseMembership"("houseId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentHouseMembership_studentId_year_key" ON "StudentHouseMembership"("studentId", "year");

-- AddForeignKey
ALTER TABLE "SchoolHouse" ADD CONSTRAINT "SchoolHouse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHouseMembership" ADD CONSTRAINT "StudentHouseMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHouseMembership" ADD CONSTRAINT "StudentHouseMembership_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "SchoolHouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHouseMembership" ADD CONSTRAINT "StudentHouseMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
