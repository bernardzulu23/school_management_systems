# Parent USSD portal — Phase 3 P3.5

Feature-phone access via Africa's Talking USSD.

## Callback URL

`POST https://<your-domain>/api/ussd`

Configure in the Africa's Talking dashboard (USSD service → callback URL).

## Menu

1. Check child attendance (today + term %)
2. Latest result
3. School contact

Parents enter the student exam number / ID after choosing 1 or 2. Guardian phone must match `parent_father_contact`, `parent_mother_contact`, or `guardian_contact` on the student record.

## Local test

```bash
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"260971234567","text":""}'
```

Response format: `CON ...` (continue) or `END ...` (end session).

## Environment

Uses existing Neon DB via Prisma. No extra API keys on the USSD route itself; Africa's Talking handles carrier billing on their side.
