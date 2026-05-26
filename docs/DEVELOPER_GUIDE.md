# ZSMS Developer Guide

Practical guide for contributing to the Zambian School Management System.

---

## Quick start (15 minutes)

1. Clone the repo
2. Copy `.env.example` → `.env.local` and fill required values ([ENVIRONMENT.md](./ENVIRONMENT.md))
3. `npm install`
4. `npx prisma generate && npx prisma db push`
5. `npm run seed:ecz`
6. `npm run dev` → [http://localhost:3000](http://localhost:3000)

Full steps: [SETUP.md](./SETUP.md).

---

## Architecture overview

### Multi-tenant subdomains

- Each school has a **subdomain** (e.g. `ndake.bluepeacktechnologies.com`) or custom domain.
- `proxy.js` / middleware resolves the host → `schoolId`.
- Almost every API route must scope data with **`schoolId`** from `resolveAuthenticatedSchoolId()`.

### Request flow (typical API route)

```
Browser → Next.js route handler
       → authMiddleware (JWT cookie)
       → resolveAuthenticatedSchoolId (tenant)
       → requireFeature / subscriptionGate (plan)
       → Prisma query (always filter by schoolId)
       → NextResponse.json
```

### Auth

- **JWT** in httpOnly cookie; secret `JWT_SECRET` (≥ 32 chars).
- Refresh tokens use `JWT_REFRESH_SECRET` in production.
- Roles: `teacher`, `HOD`, `headteacher`, `ADMIN`, `student`, platform admin (separate).

### AI layer

- **Groq only** via Vercel AI SDK (`ai` + `@ai-sdk/groq`).
- Entry points: `lib/ai/client.js`, `lib/ai/groq-client.ts`.
- Structured outputs: Zod schemas in `lib/ai/schemas.js` → `generateAIObject()`.
- Streaming lesson plans: `createGroqTextEventStream()` → SSE for `useAIStream`.

See [AI_GUIDE.md](./AI_GUIDE.md).

### Payments & billing

- **Lipila** mobile money: onboarding (`/api/onboarding/pay`) and school upgrades (`/api/billing/subscription-payment`).
- Callback: `/api/payments/lipila/callback` → `lib/billing/activate-plan-payment.js`.
- Plan prices: `lib/billing/plan-pricing.js`.

---

## Adding a new API route

1. Create `app/api/your-feature/route.js` (or `[id]/route.js` for dynamic segments).
2. Export HTTP handlers: `export const GET = ...`, `export const POST = ...`.
3. Use `export const dynamic = 'force-dynamic'` for routes that touch DB/auth.
4. Wrap with `withErrorHandler` and/or `withSecureApi` from `lib/middleware/`.

### Template

```javascript
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import prisma from '@/lib/prisma'
import { logger, captureError } from '@/lib/utils/logger'

export const POST = withErrorHandler(async function POST(request) {
  const route = '/api/your-feature'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  // validate input...

  try {
    const result = await prisma.yourModel.create({
      data: { schoolId /* ... */ },
    })
    log.response(201, Date.now() - start)
    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    captureError(error, { route, schoolId, userId: auth.user?.id })
    log.response(500, Date.now() - start)
    throw error
  }
})
```

### Checklist

- [ ] Auth + role check
- [ ] `schoolId` on every Prisma query
- [ ] Input validation (Zod or explicit checks)
- [ ] No secrets in logs
- [ ] Regenerate [API_ROUTES.md](./API_ROUTES.md): `npm run docs:api-routes`

---

## Adding a new AI feature

1. Define a **Zod schema** in `lib/ai/schemas.js`.
2. Write **system + user prompts** (Zambian context, plain text if stored in DB).
3. Call `generateAIObject(schema, system, userPrompt)` or `generateAIText` / `streamAIText`.
4. Enforce plan + quota: `requireFeature(schoolId, 'feature-id')`, `checkAILimit(schoolId)`.
5. Track usage: `trackAIUsage(schoolId, 'feature-id')`.
6. Document in [AI_GUIDE.md](./AI_GUIDE.md).

Model fallback is automatic in `lib/ai/client.js` (`GROQ_FALLBACK_MODELS`).

---

## Adding a new SMS template

1. Add template string in `lib/sms/africastalking.js` → `SMS_TEMPLATES`.
2. Send via `sendSMS({ to, template, vars })` or `sendAfricasTalkingSms` from `lib/sms.js`.
3. Log with `pushSmsLog({ schoolId, event, ... })` where applicable.
4. Document in [SMS_GUIDE.md](./SMS_GUIDE.md).

---

## Database migrations

1. Edit `prisma/schema.prisma`.
2. Local: `npx prisma db push` (prototyping) or `npx prisma migrate dev --name describe_change`.
3. Production: `npx prisma migrate deploy` (Vercel build runs generate + migrate via `scripts/vercel-build.js`).
4. Add seed data in `prisma/seeds/` and wire `package.json` script if needed.

**School billing upgrades** use `SchoolPlanPayment` — ensure migrations are applied before `/api/billing/subscription-payment`.

---

## ECZ compliance rules

All SBA/ECZ logic must follow [ECZ_COMPLIANCE.md](./ECZ_COMPLIANCE.md):

- Form 4: **no SBA** — enforce in `lib/middleware/ecz-validation.js`.
- Zambian context required for SBA tasks.
- Term weights, 31 January submission deadline.
- Reference data: `npm run seed:ecz`.

---

## How to add logging to a new API route

See the structured logger template in the previous version of this guide — use `logger({ route, schoolId, userId })` and `captureError()` from `@/lib/utils/logger`.

### Sentry

**Project:** `zinks-0m` / `javascript-nextjs` (EU)

- Server: `sentry.server.config.ts`, `instrumentation.js`
- Client: `instrumentation-client.js`
- Test page: `/sentry-example-page` (production + DSN)

---

## Common bugs and fixes

| Symptom                                   | Cause                              | Fix                                           |
| ----------------------------------------- | ---------------------------------- | --------------------------------------------- |
| `JWT_SECRET is not set` in production     | Missing Vercel env                 | Set `JWT_SECRET` ≥ 32 chars                   |
| ECZ / SBA 500                             | DB schema not deployed             | `npx prisma db push`, `npm run seed:ecz`      |
| Billing upgrade 503                       | `SchoolPlanPayment` table missing  | Run migrations / db push                      |
| Lesson plan download fails                | Empty content or Word export error | Generate & save first; check API error body   |
| AI shows "Upgrade" for model errors       | Wrong error UI                     | Use plan-gated errors only for `PLAN_*` codes |
| CSP blocks blob worker                    | Missing `worker-src`               | See `lib/security/headers.js`                 |
| Pre-commit ESLint fails `conf`            | Broken `node_modules`              | `npm install @babel/parser --save-dev`        |
| `npm run build` fails `conf` / wrong Next | Wrong Next version                 | `package.json` should have `next@16.x`        |
| QR mark duplicate                         | Expected                           | 409 — student already marked                  |
| Lipila payment pending forever            | Callback URL / keys                | Check `LIPILA_API_KEY`, callback route logs   |

Add new rows here when you fix production issues.

---

## Deployment

### Vercel

1. Connect repo; set **Node 20**.
2. Add all required env vars from [ENVIRONMENT.md](./ENVIRONMENT.md).
3. Build command: `npm run build` (runs Prisma generate + `next build`).
4. Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `RESEND_API_KEY`, etc.

See [doc/VERCEL_DEPLOY.md](./doc/VERCEL_DEPLOY.md).

### Post-deploy

```bash
npx prisma migrate deploy   # if using migrations
npm run seed:ecz              # once per environment (idempotent upsert)
```

---

## Related docs

| Doc                                          | Topic               |
| -------------------------------------------- | ------------------- |
| [README.md](./README.md)                     | Documentation index |
| [SETUP.md](./SETUP.md)                       | Local setup         |
| [ENVIRONMENT.md](./ENVIRONMENT.md)           | Env variables       |
| [TESTING.md](./TESTING.md)                   | Vitest              |
| [AI_GUIDE.md](./AI_GUIDE.md)                 | AI features         |
| [ECZ_COMPLIANCE.md](./ECZ_COMPLIANCE.md)     | ECZ rules           |
| [SMS_GUIDE.md](./SMS_GUIDE.md)               | SMS                 |
| [QR_ATTENDANCE.md](./QR_ATTENDANCE.md)       | QR attendance       |
| [API_ROUTES.md](./API_ROUTES.md)             | Route reference     |
| [PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md) | Phase 1 gate        |
| [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)     | Phase 2 scope       |
| [../CHANGELOG.md](../CHANGELOG.md)           | Release notes       |

---

## Notes for future developers

**Groq vs OpenAI/Anthropic:** Groq free tier (~14,400 req/day) fits pilot schools. AI runtime uses `@ai-sdk/groq` only; do not add paid AI SDKs to production paths.

**Vercel AI SDK vs raw fetch:** Typed Zod outputs map to Prisma/ECZ models; markdown blobs are harder to validate.

**Africa's Talking vs Twilio:** AT supports MTN/Airtel/Zamtel in Zambia natively.

**QR before face recognition:** QR works on 2G and any camera app; face needs lighting, models, and device power.
