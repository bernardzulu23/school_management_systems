ALTER TABLE "School" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "School" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "School" ADD COLUMN "verificationExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX "School_verificationToken_key" ON "School"("verificationToken");

