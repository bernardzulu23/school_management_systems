-- Pilot handoff claimers are PlatformAdmin rows, not tenant User rows.
-- Drop User FK on ChatSession.assignedToId and store a denormalized display name.

ALTER TABLE "ChatSession" DROP CONSTRAINT IF EXISTS "ChatSession_assignedToId_fkey";

ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "assignedToName" TEXT;

CREATE INDEX IF NOT EXISTS "ChatSession_assignedToId_idx" ON "ChatSession"("assignedToId");
