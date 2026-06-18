-- Backfill School.ownershipType for schools registered before the onboarding selector.
--
-- The column defaults to 'PRIVATE' (see migration 20260613180000_transport_hostel_ownership).
-- Existing tenants therefore keep private-school feature access until you set the correct type.
--
-- Run against production (Neon) after reviewing each school:
--   npx prisma db execute --file prisma/scripts/backfill-school-ownership.sql
--
-- Example: government secondary school
-- UPDATE "School"
-- SET "ownershipType" = 'GOVERNMENT'
-- WHERE subdomain = 'ndakedaysecondaryschool';

-- Safe no-op guard (column is NOT NULL; included for manual runs on older snapshots)
UPDATE "School"
SET "ownershipType" = 'PRIVATE'
WHERE "ownershipType" IS NULL;
