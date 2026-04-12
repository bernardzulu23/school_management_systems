ALTER TABLE "School" ADD COLUMN "isPubliclyListed" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "School_isPubliclyListed_idx" ON "School"("isPubliclyListed");

ALTER TABLE "Feedback" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Feedback_isPublic_idx" ON "Feedback"("isPublic");

