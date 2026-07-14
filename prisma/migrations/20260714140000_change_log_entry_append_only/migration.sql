-- Prompt 10: system-wide append-only ChangeLogEntry

CREATE TABLE IF NOT EXISTS "ChangeLogEntry" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "actorLabel" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "entityLabel" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChangeLogEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChangeLogEntry_schoolId_createdAt_idx"
  ON "ChangeLogEntry"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChangeLogEntry_schoolId_actorUserId_createdAt_idx"
  ON "ChangeLogEntry"("schoolId", "actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChangeLogEntry_schoolId_module_createdAt_idx"
  ON "ChangeLogEntry"("schoolId", "module", "createdAt");
CREATE INDEX IF NOT EXISTS "ChangeLogEntry_schoolId_action_createdAt_idx"
  ON "ChangeLogEntry"("schoolId", "action", "createdAt");
CREATE INDEX IF NOT EXISTS "ChangeLogEntry_schoolId_entityType_entityId_idx"
  ON "ChangeLogEntry"("schoolId", "entityType", "entityId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChangeLogEntry_schoolId_fkey'
  ) THEN
    ALTER TABLE "ChangeLogEntry"
      ADD CONSTRAINT "ChangeLogEntry_schoolId_fkey"
      FOREIGN KEY ("schoolId") REFERENCES "School"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.change_log_entry_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'ChangeLogEntry is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS change_log_entry_no_update ON "ChangeLogEntry";
DROP TRIGGER IF EXISTS change_log_entry_no_delete ON "ChangeLogEntry";

CREATE TRIGGER change_log_entry_no_update
  BEFORE UPDATE ON "ChangeLogEntry"
  FOR EACH ROW
  EXECUTE FUNCTION public.change_log_entry_append_only();

CREATE TRIGGER change_log_entry_no_delete
  BEFORE DELETE ON "ChangeLogEntry"
  FOR EACH ROW
  EXECUTE FUNCTION public.change_log_entry_append_only();
