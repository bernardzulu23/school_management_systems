-- Custom Android SMS gateway (bridge while Africala sender-ID pending)

ALTER TABLE "SchoolSmsSettings" ADD COLUMN IF NOT EXISTS "customGatewayEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "SMSGateway" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "apiTokenEncrypted" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "lastHealthCheck" TIMESTAMP(3),
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSGateway_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SMSGateway_deviceToken_key" ON "SMSGateway"("deviceToken");
CREATE INDEX IF NOT EXISTS "SMSGateway_schoolId_idx" ON "SMSGateway"("schoolId");
CREATE INDEX IF NOT EXISTS "SMSGateway_isActive_idx" ON "SMSGateway"("isActive");

ALTER TABLE "SMSGateway" DROP CONSTRAINT IF EXISTS "SMSGateway_schoolId_fkey";
ALTER TABLE "SMSGateway" ADD CONSTRAINT "SMSGateway_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SmsLog" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'AFRICALA';
ALTER TABLE "SmsLog" ADD COLUMN IF NOT EXISTS "gatewayId" TEXT;
ALTER TABLE "SmsLog" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

CREATE INDEX IF NOT EXISTS "SmsLog_gatewayId_idx" ON "SmsLog"("gatewayId");
CREATE INDEX IF NOT EXISTS "SmsLog_channel_status_gatewayId_idx" ON "SmsLog"("channel", "status", "gatewayId");

ALTER TABLE "SmsLog" DROP CONSTRAINT IF EXISTS "SmsLog_gatewayId_fkey";
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_gatewayId_fkey"
  FOREIGN KEY ("gatewayId") REFERENCES "SMSGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
