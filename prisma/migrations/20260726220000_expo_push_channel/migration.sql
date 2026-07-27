-- Expo push channel + preference flag for mobile devices

ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'EXPO_PUSH';

ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "expoPushEnabled" BOOLEAN NOT NULL DEFAULT true;
