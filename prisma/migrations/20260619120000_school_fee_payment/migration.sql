-- School fee mobile money payments (Lipila collections)
CREATE TABLE IF NOT EXISTS "SchoolFeePayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "initiatedById" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "provider" TEXT,
    "referenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accountNumber" TEXT,
    "narration" TEXT,
    "paymentType" TEXT,
    "studentId" TEXT,
    "lipilaStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeePayment_referenceId_key" ON "SchoolFeePayment"("referenceId");
CREATE INDEX IF NOT EXISTS "SchoolFeePayment_schoolId_idx" ON "SchoolFeePayment"("schoolId");
CREATE INDEX IF NOT EXISTS "SchoolFeePayment_status_idx" ON "SchoolFeePayment"("status");
CREATE INDEX IF NOT EXISTS "SchoolFeePayment_createdAt_idx" ON "SchoolFeePayment"("createdAt");

DO $$ BEGIN
  ALTER TABLE "SchoolFeePayment" ADD CONSTRAINT "SchoolFeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
