-- HOD department administrative files

CREATE TABLE "HodBudgetCategory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodBudgetCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodBudgetTransaction" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodBudgetTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodCorrespondence" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "direction" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "itemDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "itemType" TEXT NOT NULL DEFAULT 'letter',
    "attachments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodCorrespondence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodMeeting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "meetingType" TEXT NOT NULL DEFAULT 'Department',
    "meetingScope" TEXT NOT NULL DEFAULT 'department',
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingTime" TEXT,
    "duration" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agenda" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minutes" TEXT,
    "actionItems" INTEGER NOT NULL DEFAULT 0,
    "minutesStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodMeeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodStockItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "maximumStock" INTEGER NOT NULL DEFAULT 100,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodStockItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodStockMovement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HodStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodDailyRoutineTask" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "taskDate" TIMESTAMP(3) NOT NULL,
    "taskTime" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration" TEXT,
    "assignedTo" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodDailyRoutineTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodWeeklyRoutinePlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "dayName" TEXT NOT NULL,
    "focus" TEXT,
    "tasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HodWeeklyRoutinePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HodWeeklyRoutinePlan_schoolId_departmentId_dayName_key" ON "HodWeeklyRoutinePlan"("schoolId", "departmentId", "dayName");

CREATE INDEX "HodBudgetCategory_schoolId_idx" ON "HodBudgetCategory"("schoolId");
CREATE INDEX "HodBudgetCategory_schoolId_departmentId_idx" ON "HodBudgetCategory"("schoolId", "departmentId");
CREATE INDEX "HodBudgetTransaction_schoolId_idx" ON "HodBudgetTransaction"("schoolId");
CREATE INDEX "HodBudgetTransaction_schoolId_departmentId_idx" ON "HodBudgetTransaction"("schoolId", "departmentId");
CREATE INDEX "HodBudgetTransaction_categoryId_idx" ON "HodBudgetTransaction"("categoryId");
CREATE INDEX "HodCorrespondence_schoolId_idx" ON "HodCorrespondence"("schoolId");
CREATE INDEX "HodCorrespondence_schoolId_departmentId_idx" ON "HodCorrespondence"("schoolId", "departmentId");
CREATE INDEX "HodCorrespondence_schoolId_direction_idx" ON "HodCorrespondence"("schoolId", "direction");
CREATE INDEX "HodMeeting_schoolId_idx" ON "HodMeeting"("schoolId");
CREATE INDEX "HodMeeting_schoolId_departmentId_idx" ON "HodMeeting"("schoolId", "departmentId");
CREATE INDEX "HodMeeting_schoolId_status_idx" ON "HodMeeting"("schoolId", "status");
CREATE INDEX "HodMeeting_schoolId_meetingScope_idx" ON "HodMeeting"("schoolId", "meetingScope");
CREATE INDEX "HodStockItem_schoolId_idx" ON "HodStockItem"("schoolId");
CREATE INDEX "HodStockItem_schoolId_departmentId_idx" ON "HodStockItem"("schoolId", "departmentId");
CREATE INDEX "HodStockMovement_schoolId_idx" ON "HodStockMovement"("schoolId");
CREATE INDEX "HodStockMovement_itemId_idx" ON "HodStockMovement"("itemId");
CREATE INDEX "HodDailyRoutineTask_schoolId_idx" ON "HodDailyRoutineTask"("schoolId");
CREATE INDEX "HodDailyRoutineTask_schoolId_departmentId_idx" ON "HodDailyRoutineTask"("schoolId", "departmentId");
CREATE INDEX "HodDailyRoutineTask_schoolId_taskDate_idx" ON "HodDailyRoutineTask"("schoolId", "taskDate");
CREATE INDEX "HodWeeklyRoutinePlan_schoolId_idx" ON "HodWeeklyRoutinePlan"("schoolId");

ALTER TABLE "HodBudgetCategory" ADD CONSTRAINT "HodBudgetCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodBudgetTransaction" ADD CONSTRAINT "HodBudgetTransaction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodBudgetTransaction" ADD CONSTRAINT "HodBudgetTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HodBudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HodCorrespondence" ADD CONSTRAINT "HodCorrespondence_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodMeeting" ADD CONSTRAINT "HodMeeting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodStockItem" ADD CONSTRAINT "HodStockItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodStockMovement" ADD CONSTRAINT "HodStockMovement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodStockMovement" ADD CONSTRAINT "HodStockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HodStockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodDailyRoutineTask" ADD CONSTRAINT "HodDailyRoutineTask_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodWeeklyRoutinePlan" ADD CONSTRAINT "HodWeeklyRoutinePlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
