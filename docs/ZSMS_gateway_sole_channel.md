# Africa's Talking primary + Android gateway fallback

School outbound SMS uses **Africa's Talking first**, then the Android gateway.

## Routing (`lib/sms/sendOutbound.js`)

1. **Africa's Talking** when `AFRICASTALKING_*` / `AFRICAS_TALKING_*` credentials are set.
2. **Custom Android SIM gateway** only if AT fails or is unconfigured, and `customGatewayEnabled` is on with an active gateway seen within **5 minutes**.

Set `SMS_PREFER_CUSTOM_GATEWAY=true` only if you intentionally want gateway-first (cost mode).

Bulk broadcast (`/api/sms/broadcast`) still uses Africa's Talking + QStash only.

## Stale gateway alerts

Cron `GET /api/cron/sms-gateway-health` (`CRON_SECRET`) checks active `SMSGateway` rows. If `lastSeenAt` is older than 15 minutes and no alert was sent for this outage episode (`lastStaleAlertSentAt`), it fans out to **Telegram** (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`) and **WhatsApp** via CallMeBot (`CALLMEBOT_PHONE` / `CALLMEBOT_APIKEY`) independently (`Promise.allSettled`). Successful polls clear `lastStaleAlertSentAt`. An episode is marked alerted if **at least one** channel delivers.

**Scheduling:** Vercel Hobby only allows **daily** crons, so `vercel.json` runs a daily backup check (`15 7 * * *`). For near-real-time detection (every 5 minutes), point an external scheduler (e.g. cron-job.org) at the same endpoint with header `Authorization: Bearer $CRON_SECRET` or `x-cron-secret: $CRON_SECRET`. Upgrade to Vercel Pro to restore an in-platform `*/5` schedule.

## Ops note

Keep a second phone/SIM documented for swap — gateway remains useful for cost savings when online; Africa's Talking covers reliability when it is not.
