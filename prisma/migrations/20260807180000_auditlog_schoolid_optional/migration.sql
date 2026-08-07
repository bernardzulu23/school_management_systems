-- AlterTable: allow platform superadmin LOGIN rows without a school tenant
ALTER TABLE "AuditLog" ALTER COLUMN "schoolId" DROP NOT NULL;
