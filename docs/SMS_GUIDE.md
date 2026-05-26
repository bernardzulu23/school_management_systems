# ZSMS SMS Guide (Africa's Talking)

ZSMS uses the official [`africastalking`](https://www.npmjs.com/package/africastalking) SDK for outbound SMS.

## Setup (sandbox for development)

1. Create an account at [africastalking.com](https://africastalking.com).
2. Create an app and copy API credentials.
3. In development, you can use sandbox credentials (`username=sandbox`).
4. Set environment variables:

```env
AFRICASTALKING_API_KEY=...
AFRICASTALKING_USERNAME=...
```

When these are missing, `env.features.sms` is false and sends are skipped safely.

## Send an SMS from code

Preferred service:

```javascript
import { smsService } from '@/lib/sms/africastalking'

await smsService.sendSMS(['+260971234567'], 'Your message here')
```

Backward-compatible helper still used by API routes:

```javascript
import { sendAfricasTalkingSms } from '@/lib/sms'

await sendAfricasTalkingSms({
  to: ['+260971234567'],
  message: 'Your message here',
  from: 'ZSMS',
})
```

## Available SMS templates

Defined in `lib/sms/africastalking.js`:

- `PORTAL_CREATED(schoolName, subdomain)`
- `SBA_DEADLINE_REMINDER(teacherName, subject, form)`
- `ATTENDANCE_ALERT(studentName, date, schoolName)`
- `RESULTS_PUBLISHED(studentName, term)`
- `PAYMENT_CONFIRMED(amount, schoolName)`

## Add a new template

1. Open `lib/sms/africastalking.js`.
2. Add a new key under `SMS_TEMPLATES`.
3. Keep language concise and under SMS length limits where possible.
4. Reuse from route/service code via `SMS_TEMPLATES.YOUR_KEY(...)`.

## Zambia phone format requirements

Accepted output format is E.164 Zambia mobile:

- `+260XXXXXXXXX` where network starts with `7` or `9`
- Examples: `+260971234567`, `+260955555555`

Normalization handled by:

- `normalizeZambianPhoneNumber()`
- `normalizeZambianPhoneNumbers()`

Invalid numbers are filtered out before sending.
