-- Phase 6: Lipila payment ledger + optional invoice bind on SchoolFeePayment
ALTER TABLE "SchoolFeePayment" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
CREATE INDEX IF NOT EXISTS "SchoolFeePayment_invoiceId_idx" ON "SchoolFeePayment"("invoiceId");

CREATE TABLE IF NOT EXISTS "PaymentLedgerEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'lipila',
    "paymentKind" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "referenceId" TEXT,
    "eventKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "lipilaStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLedgerEntry_provider_eventKey_key"
  ON "PaymentLedgerEntry"("provider", "eventKey");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_paymentId_createdAt_idx"
  ON "PaymentLedgerEntry"("paymentId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_schoolId_createdAt_idx"
  ON "PaymentLedgerEntry"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_action_createdAt_idx"
  ON "PaymentLedgerEntry"("action", "createdAt");
