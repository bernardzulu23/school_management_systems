# Custom Android gateway + Africa's Talking SMS

School outbound SMS uses **gateway first, then Africa's Talking**.

## Routing (`lib/sms/sendOutbound.js`)

1. **Custom Android SIM gateway** when `customGatewayEnabled` is on, an active `SMSGateway` exists, and `lastSeenAt` is within **5 minutes**.
2. Otherwise **Africa's Talking** (`AFRICASTALKING_API_KEY` + `AFRICASTALKING_USERNAME`).

Offline or missing gateway does **not** leave stuck `PENDING` rows — the send falls through to Africa's Talking.

Bulk broadcast (`/api/sms/broadcast`) still uses Africa's Talking + QStash only.

## Stale gateway alerts

Cron `GET /api/cron/sms-gateway-health` (`CRON_SECRET`) checks active `SMSGateway` rows. If `lastSeenAt` is older than 15 minutes and no alert was sent for this outage episode (`lastStaleAlertSentAt`), it fans out to **Telegram** (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`) and **WhatsApp** via CallMeBot (`CALLMEBOT_PHONE` / `CALLMEBOT_APIKEY`) independently (`Promise.allSettled`). Successful polls clear `lastStaleAlertSentAt`. An episode is marked alerted if **at least one** channel delivers.

**Scheduling:** Vercel Hobby only allows **daily** crons, so `vercel.json` runs a daily backup check (`15 7 * * *`). For near-real-time detection (every 5 minutes), point an external scheduler (e.g. cron-job.org) at the same endpoint with header `Authorization: Bearer $CRON_SECRET` or `x-cron-secret: $CRON_SECRET`. Upgrade to Vercel Pro to restore an in-platform `*/5` schedule.

## Ops note

Keep a second phone/SIM documented for swap — gateway remains useful for cost savings when online; Africa's Talking covers reliability when it is not.
