# ZSMS environment variables

This document describes every environment variable used by the Zambian School Management System, how to configure them locally, and how to deploy them on Vercel.

Validation runs automatically on server startup via `lib/config/env.js` (imported from `app/layout.js`). Missing **required** variables cause a clear startup error instead of a runtime 500.

---

## Quick start (local)

1. Copy the template:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in **required** values (see table below).
3. Start the app:
   ```bash
   npm run dev
   ```
4. Verify health:
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/ping
   ```

For full local setup (database, seeds), see [docs/doc/SETUP_GUIDE.md](doc/SETUP_GUIDE.md).

---

## Required variables

| Variable                                 | Purpose                                              | Where to get it                                                  |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                           | Pooled PostgreSQL connection (runtime)               | [Neon](https://neon.tech) dashboard → Connection string (pooled) |
| `DIRECT_URL`                             | Direct PostgreSQL URL (migrations)                   | Neon → Connection string (direct / non-pooler)                   |
| `JWT_SECRET`                             | Signs access tokens (min **32** characters)          | Generate: `openssl rand -hex 32`                                 |
| `RESEND_API_KEY`                         | Transactional email                                  | [Resend](https://resend.com) → API Keys (`re_...`)               |
| `EMAIL_FROM_NOREPLY` **or** `EMAIL_FROM` | Verified sender for verification & portal emails     | Resend → Domains → verified address                              |
| `GROQ_API_KEY`                           | AI lesson planner, quizzes, stories, report comments | [Groq Console](https://console.groq.com) (`gsk_...`, free tier)  |

**Email note:** The app prefers `EMAIL_FROM_NOREPLY` (used by `config/email.js`). `EMAIL_FROM` is accepted as a fallback.

---

## Strongly recommended (production)

| Variable                 | Purpose                                     | Where to get it                   |
| ------------------------ | ------------------------------------------- | --------------------------------- |
| `JWT_REFRESH_SECRET`     | Refresh token signing (min 32 chars)        | `openssl rand -hex 32`            |
| `COOKIE_DOMAIN`          | Share auth cookies across school subdomains | e.g. `.bluepeacktechnologies.com` |
| `APP_BASE_DOMAIN`        | Root domain for portal links                | e.g. `bluepeacktechnologies.com`  |
| `NEXT_PUBLIC_APP_ORIGIN` | Public URL for CORS and redirects           | `https://your-domain.com`         |

`lib/security/env.js` enforces weak-secret checks in production when `NODE_ENV=production`.

---

## Optional — feature flags

When these are unset, related features are disabled (startup still succeeds).

| Variable                                              | Feature                             | Notes                                                                   |
| ----------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `LIPILA_API_KEY`                                      | Mobile money (onboarding + billing) | Also accepts `LIPILA_SECRET_KEY`                                        |
| `LIPILA_BASE_URL`                                     | Lipila API host                     | Default: `https://api.lipila.dev` (dev), `https://blz.lipila.io` (prod) |
| `AFRICASTALKING_API_KEY`                              | Outbound SMS                        | Both key and username needed for SMS                                    |
| `AFRICASTALKING_USERNAME`                             | Africa's Talking account            | Sandbox available for testing                                           |
| `EMAIL_INFO`                                          | Contact form recipient              | Defaults to info@ address in code                                       |
| `ALLOW_DIRECT_SCHOOL_REGISTRATION`                    | Legacy `/api/schools/register`      | Set `true` only for dev; production uses `/onboarding`                  |
| `SENTRY_DSN`                                          | Server-side Sentry DSN              | [sentry.io](https://sentry.io) → Project → Client Keys                  |
| `NEXT_PUBLIC_SENTRY_DSN`                              | Browser Sentry DSN (same value)     | Required for client error capture                                       |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Optional source map upload on build | Sentry → Settings → Auth Tokens                                         |
| `GROQ_MODEL`                                          | Override default Groq model         | Default: `llama-3.3-70b-versatile`                                      |

Payment provider logos: place files in `public/payments/` (`mtn.jpg`, `airtel.jpg`, `zamtel.png`) or set `NEXT_PUBLIC_PAYMENT_LOGO_*` URLs.

---

## Local development helpers

| Variable                                           | Purpose                                        |
| -------------------------------------------------- | ---------------------------------------------- |
| `LOCAL_DEV_SCHOOL_SUBDOMAIN`                       | Locks localhost to one school tenant           |
| `LOCAL_DEV_PASSWORD`                               | Password for seeded local accounts             |
| `DEV_ONBOARDING_SKIP_EMAIL`                        | Skip Resend and auto-verify email (local only) |
| `NEXT_PUBLIC_SHOW_DEV_LOGIN_HINT`                  | Show dev login hints on login page             |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` | Platform console at `/platform/login`          |

---

## Programmatic access

```javascript
import { env, validateEnv } from '@/lib/config/env'

validateEnv() // throws if misconfigured
env.features.payments // true when LIPILA_API_KEY set
env.features.email // true when Resend + from address set
```

---

## Health check

| Endpoint                 | Behavior                                           |
| ------------------------ | -------------------------------------------------- |
| `GET /api/health`        | Database probe + feature flags; **503** if DB down |
| `GET /api/health?live=1` | Fast liveness (no DB); always **200**              |
| `GET /api/ping`          | Minimal JSON `{ ok: true }` for load balancers     |

Example response (`/api/health`):

```json
{
  "status": "healthy",
  "timestamp": "2026-05-25T12:00:00.000Z",
  "version": "2.0.3",
  "checks": {
    "database": true,
    "email": true,
    "ai": true,
    "sms": false,
    "payments": true
  }
}
```

---

## Vercel deployment

1. Create a Neon project and copy **pooled** and **direct** connection strings.
2. In Vercel → Project → **Settings** → **Environment Variables**, add all **required** variables for **Production**, **Preview**, and **Development** as needed.
3. Set `COOKIE_DOMAIN` and `APP_BASE_DOMAIN` for your production domain.
4. Set `LIPILA_API_KEY` and ensure Lipila can reach:
   `https://{your-domain}/api/onboarding/lipila/callback`
5. Deploy; confirm `GET https://{your-domain}/api/health` returns `"status": "healthy"`.

See also [docs/doc/VERCEL_DEPLOY.md](doc/VERCEL_DEPLOY.md) and [docs/doc/DEPLOY.md](doc/DEPLOY.md).

---

## Troubleshooting

| Symptom                                     | Fix                                                 |
| ------------------------------------------- | --------------------------------------------------- |
| Startup error listing missing env vars      | Compare `.env.local` to `.env.example` and this doc |
| `JWT_SECRET must be at least 32 characters` | Use a longer random secret                          |
| Health `database: false`                    | Check `DATABASE_URL`, Neon IP allowlist, SSL params |
| `email: false` in health                    | Set `RESEND_API_KEY` and `EMAIL_FROM_NOREPLY`       |
| Payments disabled                           | Set `LIPILA_API_KEY`; see `lib/payments/lipila.js`  |

---

## Related files

| File                  | Role                                 |
| --------------------- | ------------------------------------ |
| `lib/config/env.js`   | Validation + `env` export            |
| `lib/security/env.js` | Production secret strength checks    |
| `.env.example`        | Committed template (no secrets)      |
| `app/layout.js`       | Calls `validateEnv()` on server boot |
