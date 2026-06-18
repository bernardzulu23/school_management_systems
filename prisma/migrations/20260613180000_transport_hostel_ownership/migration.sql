-- School ownership (private vs government) for feature gating
CREATE TYPE "SchoolOwnership" AS ENUM ('PRIVATE', 'GOVERNMENT');

ALTER TABLE "School" ADD COLUMN "ownershipType" "SchoolOwnership" NOT NULL DEFAULT 'PRIVATE';

-- Transport routes
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driver" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentBusRoute" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBusRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelRoom" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentHostel" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentHostel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBusRoute_studentId_key" ON "StudentBusRoute"("studentId");
CREATE UNIQUE INDEX "StudentBusRoute_studentId_schoolId_key" ON "StudentBusRoute"("studentId", "schoolId");
CREATE INDEX "StudentBusRoute_schoolId_idx" ON "StudentBusRoute"("schoolId");
CREATE INDEX "StudentBusRoute_routeId_idx" ON "StudentBusRoute"("routeId");
CREATE INDEX "BusRoute_schoolId_idx" ON "BusRoute"("schoolId");

CREATE UNIQUE INDEX "StudentHostel_studentId_year_key" ON "StudentHostel"("studentId", "year");
CREATE INDEX "StudentHostel_schoolId_idx" ON "StudentHostel"("schoolId");
CREATE INDEX "StudentHostel_roomId_idx" ON "StudentHostel"("roomId");
CREATE INDEX "HostelRoom_schoolId_idx" ON "HostelRoom"("schoolId");

ALTER TABLE "BusRoute" ADD CONSTRAINT "BusRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentBusRoute" ADD CONSTRAINT "StudentBusRoute_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentBusRoute" ADD CONSTRAINT "StudentBusRoute_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentBusRoute" ADD CONSTRAINT "StudentBusRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHostel" ADD CONSTRAINT "StudentHostel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHostel" ADD CONSTRAINT "StudentHostel_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HostelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHostel" ADD CONSTRAINT "StudentHostel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
