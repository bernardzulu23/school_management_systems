ALTER TABLE "Result" ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'finalized';
CREATE INDEX "Result_workflowStatus_idx" ON "Result"("workflowStatus");
