# Bulk SMS broadcast (QStash + Africa's Talking)

## Flow

1. **Dashboard** `/dashboard/sms` → `POST /api/sms/broadcast` with `phoneNumbers[]` and `message`.
2. API **reserves credits** (`SchoolSmsSettings.smsBalance`) and creates `SmsBroadcast` + `SmsQueueItem` rows.
3. **QStash** calls `/api/sms/broadcast-dispatcher` (chunked, 80 per tick, self-chains until done).
4. Dispatcher publishes each number to `/api/sms/queue-worker` (signature verified).
5. Worker sends via Africa's Talking, writes `SmsLog`, refunds credit on hard failure.

## Environment

```env
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
QSTASH_CALLBACK_URL=https://your-production-domain.com
CRON_SECRET=                        # for /api/cron/sms-low-balance
```

`QSTASH_CALLBACK_URL` must be the **public HTTPS** origin QStash can reach (production school apex or main app URL).

## Credits

Each school has `SchoolSmsSettings.smsBalance`. Top up manually during pilot:

```sql
INSERT INTO "SchoolSmsSettings" ("schoolId", "smsBalance", "lowBalanceThreshold", "updatedAt")
VALUES ('<school-uuid>', 5000, 50, NOW())
ON CONFLICT ("schoolId") DO UPDATE SET "smsBalance" = 5000;
```

## Low-balance alerts

- Triggered when balance ≤ `lowBalanceThreshold` after a send (max once per 24h).
- Daily cron: `GET /api/cron/sms-low-balance` with `Authorization: Bearer $CRON_SECRET`.
- Configure alert email on `/dashboard/sms` or `PATCH /api/sms/balance`.

## Phone format

UI and API normalize `097…` → `+26097…` before enqueue.
