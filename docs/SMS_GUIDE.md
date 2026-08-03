# ZSMS SMS Guide (Android gateway + Africa's Talking)

ZSMS routes outbound SMS through **`sendOutboundSms`** in `lib/sms/sendOutbound.js`.

**Send order (default):**

1. **Africa's Talking** (cloud primary)
2. **Custom Android SIM gateway** if AT fails/unconfigured and `customGatewayEnabled` with an online gateway (seen within 5 minutes)

Set `SMS_PREFER_CUSTOM_GATEWAY=true` to reverse that order (gateway first for cost saving).

See [ZSMS_gateway_sole_channel.md](./ZSMS_gateway_sole_channel.md).

Bulk broadcast (`/api/sms/broadcast`) still uses Africa's Talking + QStash only (separate path).

## Environment variables

```env
# Cloud SMS (Africa's Talking)
AFRICASTALKING_API_KEY=...
AFRICASTALKING_USERNAME=...
# AFRICAS_TALKING_* aliases are also accepted
AFRICASTALKING_SENDER_ID=...      # optional — bulk broadcast + school SMS sender

# Onboarding welcome SMS sender (default ZSMS)
ZSMS_ONBOARDING_SENDER_ID=ZSMS
```

When AT credentials are unset, `env.features.sms` is false and cloud sends are skipped safely (gateway can still queue when online).

## Send from code

```javascript
import { sendOutboundSms, sendSchoolSms, getOnboardingSmsFrom } from '@/lib/sms'

await sendOutboundSms({
  to: ['+260971234567'],
  message: 'Your message here',
  from: getOnboardingSmsFrom(), // "ZSMS"
  schoolId,
})

// Backward-compatible alias (routes through sendOutboundSms)
await sendSchoolSms({ to: ['+260971234567'], message: 'Hello', schoolId, from: 'ZSMS' })
```

## Sender IDs

| Flow                    | Sender (`from`)                              | Message branding                 |
| ----------------------- | -------------------------------------------- | -------------------------------- |
| Onboarding welcome      | `ZSMS_ONBOARDING_SENDER_ID` (default `ZSMS`) | Body mentions ZSMS + school name |
| Parent results complete | `AFRICASTALKING_SENDER_ID`                   | Body **starts with school name** |
| Attendance alerts       | Same as school-context                       | School name in body              |

## Dev test routes (non-production only)

Requires authenticated session. Disabled when `NODE_ENV=production`.

### Onboarding welcome SMS

```bash
curl -X POST http://localhost:3000/api/sms/test/onboarding \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"to":"+260971234567","schoolName":"Test School","loginUrl":"https://test.example.com/login"}'
```

### Parent results-complete SMS

```bash
curl -X POST http://localhost:3000/api/sms/test/results-parent \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"to":"+260971234567","studentName":"Jane Banda","schoolName":"Nyimba East Day Secondary School"}'
```

Or pass `studentId` to load parent contacts and school from the database (requires school tenant context).

These routes do **not** update `ResultsStatus.smsSentAt`.

## Onboarding welcome SMS (production flow)

1. Enter **Mobile number for welcome SMS** on step 1 (before email verification) or save it later via **Save phone** on plan/setup steps.
2. Phone is stored on `SchoolRegistration.adminPhone` (`PATCH /api/onboarding/contact` or `POST /api/onboarding/start`).
3. When you **Create Portal**, welcome SMS is sent from **ZSMS** via `sendOutboundSms` (Africa's Talking first; Android gateway only if AT fails).

Requires `AFRICASTALKING_*` in `.env.local` for cloud delivery when the gateway is unavailable.

## Trial SMS credits

When onboarding completes with **plan = trial**, ZSMS grants **50 SMS credits** once per school (`grantSmsCredits` in `lib/sms/balance.js`, fields `smsLifetimeGranted` / `smsLifetimeUsed` / `trialSmsGrantedAt`). Existing trial schools at balance 0 can be backfilled with `scripts/backfill-trial-sms-credits.js`.

Operators see balance, used, and a **Subscribe** link to `/pricing` on `/dashboard/sms` when credits run out. Each send recipient reserves one credit.

## Message builders (`lib/sms.js`)

- `buildWelcomeSmsMessage({ schoolName, loginUrl })`
- `buildTermResultsCompleteSmsMessage({ studentName, studentEmail, loginUrl, schoolName })`
- `buildAttendanceSmsMessage(...)`

Legacy templates in `lib/sms/africastalking.js` (`SMS_TEMPLATES`) remain for reference.

## Zambia phone format

Accepted output format is E.164 Zambia mobile:
`+260` + `9` or `7` + 8 digits (e.g. `+260971234567`).
