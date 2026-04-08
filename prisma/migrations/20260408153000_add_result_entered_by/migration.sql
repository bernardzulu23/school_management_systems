ALTER TABLE "Result" ADD COLUMN "enteredByUserId" TEXT;
CREATE INDEX "Result_enteredByUserId_idx" ON "Result"("enteredByUserId");

