# Local development setup

Get ZSMS running locally in about **15 minutes**.

---

## Prerequisites

- **Node.js 24.x** (matches `package.json` engines)
- **npm 9+**
- **PostgreSQL** via [Neon](https://neon.tech) (free tier) or local Postgres
- Accounts (free tiers): [Resend](https://resend.com), [Groq](https://console.groq.com)

Optional: [Africa's Talking](https://africastalking.com) sandbox (SMS), Lipila dev keys (payments), Sentry (errors).

---

## 1. Clone and install

```bash
git clone <repo-url>
cd school_management_systems
npm install
```

---

## 2. Environment

```bash
cp .env.example .env.local
```

Fill required values — see [ENVIRONMENT.md](./ENVIRONMENT.md):

| Variable             | Minimum for local dev         |
| -------------------- | ----------------------------- |
| `DATABASE_URL`       | Neon pooled connection string |
| `DIRECT_URL`         | Neon direct URL (migrations)  |
| `JWT_SECRET`         | Random string ≥ 32 characters |
| `RESEND_API_KEY`     | `re_...` from Resend          |
| `EMAIL_FROM_NOREPLY` | Verified sender in Resend     |
| `GROQ_API_KEY`       | `gsk_...` from Groq           |

For multi-tenant subdomains locally, set:

```env
APP_BASE_DOMAIN=localhost
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

---

## 3. Database

```bash
npx prisma generate
npx prisma db push
```

Seed ECZ reference data (competencies + subject constructs):

```bash
npm run seed:ecz
```

Optional school/dev seeds:

```bash
npm run seed:local
# or
npm run seed:st-marys
```

---

## 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Health check:

```bash
curl http://localhost:3000/api/health
```

---

## 5. Verify quality gates

```bash
npm test
npm run build
npm run lint
```

Regenerate API route documentation:

```bash
npm run docs:api-routes
```

---

## Common local URLs

| URL                    | Purpose                           |
| ---------------------- | --------------------------------- |
| `/login`               | Staff login                       |
| `/onboarding`          | New school registration           |
| `/dashboard`           | Main app (after login)            |
| `/dashboard/billing`   | Plan upgrade + mobile money       |
| `/attend?t=...`        | QR attendance (student, no login) |
| `/sentry-example-page` | Test Sentry (production DSN only) |

---

## Troubleshooting

| Problem                           | Fix                                                                       |
| --------------------------------- | ------------------------------------------------------------------------- |
| Startup throws env error          | Missing required var — see [ENVIRONMENT.md](./ENVIRONMENT.md)             |
| `prisma db push` fails            | Check `DATABASE_URL` / `DIRECT_URL`; Neon project awake                   |
| ECZ page 500                      | Run `npx prisma db push` then `npm run seed:ecz`                          |
| AI features fail                  | Set `GROQ_API_KEY`; optional `GROQ_STRUCTURED_MODEL=llama-3.1-8b-instant` |
| Payments fail                     | Set `LIPILA_API_KEY` or use free trial onboarding path                    |
| Build `Cannot find module 'conf'` | Run `npm install` (fixes ESLint pre-commit)                               |

More detail: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) → Common bugs.

---

## Next steps

- Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for architecture and how to add features.
- Complete [PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md) before Phase 2.
