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

For full local setup (database, seeds), see [docs/SETUP.md](./SETUP.md).

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

| Variable                                              | Feature                               | Notes                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIPILA_API_KEY`                                      | Mobile money (onboarding + billing)   | Also accepts `LIPILA_SECRET_KEY`                                                                                                                                                                                                                                                                                 |
| `LIPILA_BASE_URL`                                     | Lipila API host                       | Default: `https://api.lipila.dev` (dev), `https://blz.lipila.io` (prod)                                                                                                                                                                                                                                          |
| `MOCEAN_API_TOKEN`                                    | Outbound SMS (primary)                | When set, Mocean is used before Africa's Talking; see [SMS_GUIDE.md](./SMS_GUIDE.md)                                                                                                                                                                                                                             |
| `MOCEAN_SENDER_ID`                                    | Mocean sender ID                      | Optional school-context SMS sender                                                                                                                                                                                                                                                                               |
| `ZSMS_ONBOARDING_SENDER_ID`                           | Onboarding welcome SMS                | Default `ZSMS`                                                                                                                                                                                                                                                                                                   |
| `AFRICASTALKING_API_KEY`                              | Outbound SMS (fallback)               | Both key and username needed when Mocean unset                                                                                                                                                                                                                                                                   |
| `AFRICASTALKING_USERNAME`                             | Africa's Talking account              | Sandbox available for testing; also used for bulk broadcast                                                                                                                                                                                                                                                      |
| `EMAIL_INFO`                                          | Contact form recipient                | Defaults to info@ address in code                                                                                                                                                                                                                                                                                |
| `PILOT_NOTIFY_EMAILS`                                 | Pilot / free-trial join alerts        | Comma-separated; falls back to `PLATFORM_ADMIN_EMAIL` then `EMAIL_INFO`                                                                                                                                                                                                                                          |
| `ALLOW_DIRECT_SCHOOL_REGISTRATION`                    | Legacy `/api/schools/register`        | Set `true` only for dev; production uses `/onboarding`                                                                                                                                                                                                                                                           |
| `SENTRY_DSN`                                          | Server-side Sentry DSN                | [sentry.io](https://sentry.io) → Project → Client Keys                                                                                                                                                                                                                                                           |
| `NEXT_PUBLIC_SENTRY_DSN`                              | Browser Sentry DSN (same value)       | Required for client error capture                                                                                                                                                                                                                                                                                |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Optional source map upload on build   | Sentry → Settings → Auth Tokens                                                                                                                                                                                                                                                                                  |
| `GROQ_MODEL`                                          | Default / general Groq model          | Default: `llama-3.3-70b-versatile`                                                                                                                                                                                                                                                                               |
| `GROQ_FAST_MODEL`                                     | Streaming / fast prose model          | Default: `llama-3.3-70b-versatile` (`GROQ_STREAM_MODEL` in `lib/ai/groq-config.js`)                                                                                                                                                                                                                              |
| `GROQ_STRUCTURED_MODEL`                               | Structured JSON (`generateObject`)    | Default: `llama-3.1-8b-instant` (more reliable for quiz/lesson schemas)                                                                                                                                                                                                                                          |
| `NODE_OPTIONS`                                        | Runtime Node flags (Vercel)           | Production sets `--dns-result-order=ipv4first` via `vercel.json` to reduce Undici `fetch failed` / connect timeouts to AI APIs                                                                                                                                                                                   |
| `ORTOOLS_SOLVER_URL`                                  | Timetable hybrid solver fallback      | Base URL for `solver-service` (e.g. `http://localhost:8001`); see [TIMETABLE_PIPELINE.md](./TIMETABLE_PIPELINE.md)                                                                                                                                                                                               |
| `HUGGINGFACE_API_KEY`                                 | RAG embeddings (free tier + fallback) | [HuggingFace](https://huggingface.co/settings/tokens); 384-dim MiniLM — see [RAG.md](./RAG.md)                                                                                                                                                                                                                   |
| `GEMINI_API_KEY`                                      | RAG embeddings (paid primary)         | `text-embedding-004` at 384 dimensions via batch API                                                                                                                                                                                                                                                             |
| `JINA_API_KEY`                                        | RAG embeddings (paid)                 | `jina-embeddings-v3` at 384 dimensions; batched array input                                                                                                                                                                                                                                                      |
| `OPENROUTER_API_KEY`                                  | RAG embeddings (paid)                 | OpenAI-compatible `/v1/embeddings`; default model `openai/text-embedding-3-small`                                                                                                                                                                                                                                |
| `OPENAI_API_KEY`                                      | RAG embeddings (paid)                 | `text-embedding-3-small` at 384 dimensions                                                                                                                                                                                                                                                                       |
| `VOYAGE_API_KEY`                                      | RAG embeddings (paid alternate)       | Batched requests with rate-limit retry                                                                                                                                                                                                                                                                           |
| `RAG_EMBED_PROVIDER`                                  | Pin RAG embedding provider            | One of `gemini`, `jina`, `openrouter`, `openai`, `voyage`, `huggingface` — re-index after changing                                                                                                                                                                                                               |
| `OPENROUTER_EMBED_MODEL`                              | OpenRouter embedding model            | Default: `openai/text-embedding-3-small`                                                                                                                                                                                                                                                                         |
| `JINA_EMBED_MODEL`                                    | Jina embedding model                  | Default: `jina-embeddings-v3`                                                                                                                                                                                                                                                                                    |
| `VOYAGE_EMBED_MODEL`                                  | Voyage embedding model                | Default: `voyage-3-lite`                                                                                                                                                                                                                                                                                         |
| `VOYAGE_EMBED_BATCH_SIZE`                             | Voyage batch size                     | Default: `8` (array input per API call)                                                                                                                                                                                                                                                                          |
| `VOYAGE_EMBED_BATCH_DELAY_MS`                         | Pause between Voyage batches          | Default: `0`; use `21000` for unpaid Voyage (~3 RPM)                                                                                                                                                                                                                                                             |
| `VOYAGE_RATE_LIMIT_SLEEP_MS`                          | Voyage 429 retry sleep                | Default: `20000`                                                                                                                                                                                                                                                                                                 |
| `VOYAGE_EMBED_MAX_RETRIES`                            | Voyage retries per batch              | Default: `3`                                                                                                                                                                                                                                                                                                     |
| `CRON_SECRET`                                         | Vercel cron route auth                | Required for `/api/cron/*` (ECZ reminder, SMS low balance, fee overdue, **notifications**). Send as `Authorization: Bearer $CRON_SECRET` or `x-cron-secret` header — see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md). Notifications cron is **daily** in `vercel.json` (Hobby forbids more frequent expressions). |
| `VAPID_PUBLIC_KEY`                                    | Web push (PWA)                        | Required for browser push; pair with `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:…`)                                                                                                                                                                                                                        |
| `VAPID_PRIVATE_KEY`                                   | Web push signing                      | Generate via `npx web-push generate-vapid-keys`                                                                                                                                                                                                                                                                  |
| `VAPID_SUBJECT`                                       | Web push contact                      | Default `mailto:noreply@bluepeacktechnologies.com`                                                                                                                                                                                                                                                               |
| `AWS_REGION`                                          | AWS SNS (critical SMS alerts)         | e.g. `eu-west-2` — notification SMS only (separate from Mocean school SMS)                                                                                                                                                                                                                                       |
| `AWS_ACCESS_KEY_ID`                                   | AWS SNS                               | IAM user with `sns:Publish`                                                                                                                                                                                                                                                                                      |
| `AWS_SECRET_ACCESS_KEY`                               | AWS SNS                               | Secret for SNS publish                                                                                                                                                                                                                                                                                           |
| `AWS_SNS_TOPIC_ARN`                                   | Optional SNS topic                    | If set, publishes to topic; else direct `PhoneNumber`                                                                                                                                                                                                                                                            |
| `AWS_SNS_SENDER_ID`                                   | SMS sender ID                         | Default `ZSMS`                                                                                                                                                                                                                                                                                                   |

Payment provider logos: place files in `public/payments/` (`mtn.jpg`, `airtel.jpg`, `zamtel.png`) or set `NEXT_PUBLIC_PAYMENT_LOGO_*` URLs.

### Anti-scraping (production edge security)

| Variable                      | Purpose                                                           | Default          |
| ----------------------------- | ----------------------------------------------------------------- | ---------------- |
| `ANTI_SCRAPING_ENABLED`       | Master switch (`false` disables; `true` forces on in dev)         | On in production |
| `SCRAPE_RATE_PUBLIC_GET`      | Max public GET requests per IP per minute                         | `60`             |
| `SCRAPE_RATE_PUBLIC_MUTATION` | Max public POST/PUT/PATCH/DELETE per IP per minute                | `25`             |
| `SCRAPE_RATE_AUTH_GET`        | Max authenticated GET requests per IP per 5 min (per route group) | `400`            |
| `SCRAPE_RATE_AUTH_MUTATION`   | Max authenticated mutations per IP per 5 min (per route group)    | `150`            |

---

## Local development helpers

| Variable                                           | Purpose                                        |
| -------------------------------------------------- | ---------------------------------------------- |
| `LOCAL_DEV_SCHOOL_SUBDOMAIN`                       | Locks localhost to one school tenant           |
| `LOCAL_DEV_PASSWORD`                               | Password for seeded local accounts             |
| `DEV_ONBOARDING_SKIP_EMAIL`                        | Skip Resend and auto-verify email (local only) |
| `NEXT_PUBLIC_SHOW_DEV_LOGIN_HINT`                  | Show dev login hints on login page             |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` | Platform super-admin at `/login` (apex URL)    |

### AI chat human handoff (Phase 2 — optional)

| Variable                      | Purpose                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`          | Telegram Bot API token — **metadata-only** handoff + gateway health alerts |
| `TELEGRAM_CHAT_ID`            | Destination chat id for handoff / gateway pings                            |
| `CALLMEBOT_PHONE`             | WhatsApp number (digits only, no `+`) for CallMeBot gateway alerts         |
| `CALLMEBOT_APIKEY`            | CallMeBot API key (after WhatsApp opt-in)                                  |
| `CHAT_DO_SHARED_SECRET`       | Shared secret with `chat-realtime` Worker (tickets + internal relay)       |
| `NEXT_PUBLIC_CHAT_DO_WSS_URL` | Browser WebSocket base, e.g. `wss://zsms-chat-realtime….workers.dev`       |
| `CHAT_DO_WSS_URL`             | Optional server alias (HTTP base derived for `/internal/*` notify)         |

If Telegram is unset, handoff still sets `PENDING_HUMAN`. The API returns `telegramSent: false` and the teacher UI shows that no Telegram invite was sent; server logs a warning. Platform admins claim at `/platform/support`. If the Durable Object URL is unset, claim/message APIs still work; live WS relay is skipped. See `chat-realtime/README.md` and `docs/CHAT_HANDOFF_PHASE2.md`.

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

| Endpoint                 | Behavior                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `GET /api/health`        | DB, pool, env, optional Redis; **503** if critical checks fail |
| `GET /api/health?live=1` | Fast liveness (no DB); always **200**                          |
| `GET /api/ping`          | Minimal JSON `{ ok: true }` for load balancers                 |

`status` values: `ok` (all critical checks pass), `degraded` (e.g. high DB pool or missing optional env), `down` (DB or required env failure).

Example response (`/api/health`):

```json
{
  "status": "ok",
  "timestamp": "2026-05-25T12:00:00.000Z",
  "version": "2.1.0",
  "checks": {
    "database": { "status": "ok", "responseMs": 12 },
    "dbPool": { "status": "ok", "connections": 14 },
    "environment": { "status": "ok", "missing": [] },
    "redis": { "status": "skipped" },
    "email": { "status": "ok" },
    "ai": { "status": "ok" },
    "sms": { "status": "skipped" }
  }
}
```

**Tenant audit:** `npm run audit:tenant` — see `docs/SECURITY.md` and `docs/Zsms red flag fixes.md`.

---

## Vercel deployment

1. Create a Neon project and copy **pooled** and **direct** connection strings.
2. In Vercel → Project → **Settings** → **Environment Variables**, add all **required** variables for **Production**, **Preview**, and **Development** as needed.
3. Set `COOKIE_DOMAIN` and `APP_BASE_DOMAIN` for your production domain.
4. Set `LIPILA_API_KEY` and ensure Lipila can reach:
   `https://{your-domain}/api/onboarding/lipila/callback`
5. Deploy; confirm `GET https://{your-domain}/api/health` returns `"status": "ok"`.

See also [docs/doc/VERCEL_DEPLOY.md](./doc/VERCEL_DEPLOY.md), [NEON_POST_DEPLOY_CHECKLIST.md](./NEON_POST_DEPLOY_CHECKLIST.md), and [docs/doc/LEGACY_MISC_ARCHIVE.md](./doc/LEGACY_MISC_ARCHIVE.md).

**Neon branch note:** The operational ZSMS database lives on the `import-2026-05-19` branch (`ep-red-dawn-abn43kbe`), not the Neon default `production` branch (`ep-ancient-mountain-abuub3my`). Both pooled and direct URLs must use the import branch endpoints.

---

## Troubleshooting

| Symptom                                     | Fix                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Startup error listing missing env vars      | Compare `.env.local` to `.env.example` and this doc                                                                                        |
| `JWT_SECRET must be at least 32 characters` | Use a longer random secret                                                                                                                 |
| Health `database: false`                    | Check `DATABASE_URL`, Neon IP allowlist, SSL params                                                                                        |
| App works in migrate but fails at runtime   | `DATABASE_URL` and `DIRECT_URL` must target the **same** Neon branch; see [NEON_POST_DEPLOY_CHECKLIST.md](./NEON_POST_DEPLOY_CHECKLIST.md) |
| `email: false` in health                    | Set `RESEND_API_KEY` and `EMAIL_FROM_NOREPLY`                                                                                              |
| Payments disabled                           | Set `LIPILA_API_KEY`; see `lib/payments/lipila.js`                                                                                         |

---

## Related files

| File                  | Role                                 |
| --------------------- | ------------------------------------ |
| `lib/config/env.js`   | Validation + `env` export            |
| `lib/security/env.js` | Production secret strength checks    |
| `.env.example`        | Committed template (no secrets)      |
| `app/layout.js`       | Calls `validateEnv()` on server boot |
