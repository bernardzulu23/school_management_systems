# ZSMS SMS Guide (Mocean + Africa's Talking)

ZSMS routes outbound SMS through **`sendOutboundSms`** in `lib/sms/sendOutbound.js`:

1. **Mocean** when `MOCEAN_API_TOKEN` is set (primary)
2. **Africa's Talking** when Mocean is unset but `AFRICASTALKING_API_KEY` + `AFRICASTALKING_USERNAME` are set (fallback)

Bulk broadcast (`/api/sms/broadcast`) still uses Africa's Talking + QStash only.

## Environment variables

```env
# Primary (Mocean)
MOCEAN_API_TOKEN=...
MOCEAN_SENDER_ID=...              # optional — school-context SMS sender

# Onboarding welcome SMS sender (default ZSMS)
ZSMS_ONBOARDING_SENDER_ID=ZSMS

# Fallback (Africa's Talking)
AFRICASTALKING_API_KEY=...
AFRICASTALKING_USERNAME=...
AFRICASTALKING_SENDER_ID=...      # optional — bulk broadcast + school fallback
```

When neither Mocean nor AT credentials are set, `env.features.sms` is false and sends are skipped safely.

## Send from code

```javascript
import { sendOutboundSms, sendAfricasTalkingSms, getOnboardingSmsFrom } from '@/lib/sms'

await sendOutboundSms({
  to: ['+260971234567'],
  message: 'Your message here',
  from: getOnboardingSmsFrom(), // "ZSMS"
})

// Backward-compatible alias (routes through sendOutboundSms)
await sendAfricasTalkingSms({ to: ['+260971234567'], message: 'Hello', from: 'ZSMS' })
```

## Sender IDs

| Flow                    | Sender (`from`)                                  | Message branding                                               |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| Onboarding welcome      | `ZSMS_ONBOARDING_SENDER_ID` (default `ZSMS`)     | Body mentions "Zambian School Management System" + school name |
| Parent results complete | `MOCEAN_SENDER_ID` or `AFRICASTALKING_SENDER_ID` | Body **starts with school name**                               |
| Attendance alerts       | Same as school-context                           | School name in body                                            |

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

## Message builders (`lib/sms.js`)

- `buildWelcomeSmsMessage({ schoolName, loginUrl })`
- `buildTermResultsCompleteSmsMessage({ studentName, studentEmail, loginUrl, schoolName })`
- `buildAttendanceSmsMessage(...)`

Legacy templates in `lib/sms/africastalking.js` (`SMS_TEMPLATES`) remain for reference.

## Zambia phone format

Accepted output format is E.164 Zambia mobile:

- `+260XXXXXXXXX` where network starts with `7` or `9`
- Mocean receives numbers without `+` (e.g. `260971234567`)

Normalization: `normalizePhoneNumbers()` / `normalizeZambianPhoneNumbers()`.

## Africa's Talking sandbox

1. Create an account at [africastalking.com](https://africastalking.com).
2. Use sandbox credentials (`username=sandbox`) for development fallback testing.
