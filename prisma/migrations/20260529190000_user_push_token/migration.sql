-- Mobile push notifications: store Expo push token per user
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "expoPushTokenAt" TIMESTAMP(3);
