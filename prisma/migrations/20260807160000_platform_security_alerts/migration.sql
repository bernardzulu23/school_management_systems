-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

-- AddForeignKey (nullable user, SetNull on delete)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable geo / threat fields
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "isp" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "isVpn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "isTor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "isProxy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "threatScore" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_ipAddress_createdAt_idx" ON "AuditLog"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_action_createdAt_idx" ON "AuditLog"("schoolId", "action", "createdAt");

-- CreateTable
CREATE TABLE "SecurityAlert" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "userId" TEXT,
    "email" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "pattern" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityAlert_resolved_severity_createdAt_idx" ON "SecurityAlert"("resolved", "severity", "createdAt");
CREATE INDEX "SecurityAlert_schoolId_createdAt_idx" ON "SecurityAlert"("schoolId", "createdAt");
CREATE INDEX "SecurityAlert_ipAddress_createdAt_idx" ON "SecurityAlert"("ipAddress", "createdAt");
CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip");
CREATE INDEX "BlockedIp_createdAt_idx" ON "BlockedIp"("createdAt");

-- AddForeignKey
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
