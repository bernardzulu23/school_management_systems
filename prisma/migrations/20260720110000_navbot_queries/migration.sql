-- CreateTable
CREATE TABLE "NavBotQuery" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "matchedIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NavBotQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NavBotQuery_schoolId_matchedIntentId_idx" ON "NavBotQuery"("schoolId", "matchedIntentId");

-- CreateIndex
CREATE INDEX "NavBotQuery_schoolId_createdAt_idx" ON "NavBotQuery"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "NavBotQuery" ADD CONSTRAINT "NavBotQuery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavBotQuery" ADD CONSTRAINT "NavBotQuery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
