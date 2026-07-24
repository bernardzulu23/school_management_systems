-- Stale-gateway Telegram alert debounce (one alert per outage episode)

ALTER TABLE "SMSGateway" ADD COLUMN IF NOT EXISTS "lastStaleAlertSentAt" TIMESTAMP(3);
