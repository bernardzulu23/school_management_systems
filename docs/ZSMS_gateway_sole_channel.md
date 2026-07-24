# Custom gateway as sole SMS channel

While Africa’s Talking (Africala) sender-ID approval is pending, the **custom Android SIM gateway** is the only channel that actually sends school SMS.

## Code flag

In `lib/sms/sendOutbound.js`:

```js
const ENABLE_LEGACY_SMS_FALLBACK = false
```

- **`false` (default):** after a gateway attempt (or when no gateway is available), do **not** call Mocean or Africa’s Talking. Failures are logged and written to `SmsLog` as `FAILED_NO_FALLBACK` / `failureReason = gateway_unavailable_no_fallback`.
- **`true`:** emergency only — restores the old chain: gateway (if enabled) → Mocean → Africa’s Talking.

Flip back to `false` as soon as the outage ends. Do **not** leave the flag true as the long-term architecture.

## Intended end state (after Africala approval)

Reassess: aggregators are ToS-safer and scale better; the gateway was meant as a bridge. Likely target: Africala primary, gateway as backup — not “flag forever.”

## Stale gateway alerts

Cron `GET /api/cron/sms-gateway-health` (every 5 minutes, `CRON_SECRET`) checks active `SMSGateway` rows. If `lastSeenAt` is older than 15 minutes and no alert was sent for this outage episode (`lastStaleAlertSentAt`), it pings Telegram via the same `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` as chat handoff. Successful polls clear `lastStaleAlertSentAt`.

## Ops note

Plan a second phone/SIM once stable — even a documented manual swap beats a single point of failure.
