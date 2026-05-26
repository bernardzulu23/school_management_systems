-- School subscription upgrade payments (Lipila)
CREATE TABLE IF NOT EXISTS "SchoolPlanPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL,
    "provider" TEXT,
    "referenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPlanPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolPlanPayment_referenceId_key" ON "SchoolPlanPayment"("referenceId");
CREATE INDEX IF NOT EXISTS "SchoolPlanPayment_schoolId_idx" ON "SchoolPlanPayment"("schoolId");
CREATE INDEX IF NOT EXISTS "SchoolPlanPayment_status_idx" ON "SchoolPlanPayment"("status");

DO $$ BEGIN
  ALTER TABLE "SchoolPlanPayment" ADD CONSTRAINT "SchoolPlanPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
