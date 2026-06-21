# Platform super-admin console

The platform console is for **Bluepeak platform operators** only — not school headteachers. Sign in at the same URL as everyone else: **`https://bluepeacktechnologies.com/login`** (no school subdomain required).

## What you can see

- **Overview** — total onboarded schools, active/trial/expired counts, onboarding trend by month
- **School usage** — per-school **student** and **teacher** counts only (which schools are using the program; no names or academic data)
- **Schools** — name, subdomain, plan, subscription status, province/district (metadata)
- **Provinces** — aggregated school counts per Zambian province
- **Districts** — drill-down per province (`/platform/districts?province=…`)
- **Reporting streams** — schools segmented by province + district (`reportingStreamKey`) for monitoring; future province/district admin scopes
- **Billing** — plan distribution, MRR estimate from paid transactions, recent payment rows (amount + status only)
- **Health** — Phase 1–3 readiness: CSP/HSTS, Groq, Lipila, USSD, OR-Tools, ECZ cron, RLS, JWT

## What you cannot see

By design, the platform console does **not** expose:

- Student or teacher **names**, grades, attendance, or results
- Lesson plans, timetables, or ECZ assessment row data
- Any row-level academic records

**School usage** (`/platform/usage`) shows **aggregate counts only** — how many students and teachers each school has registered — so operators can see adoption without accessing tenant PII.

School staff use tenant dashboards at `https://<subdomain>.bluepeacktechnologies.com`.

## Security

- Same login page as school staff: `/login` (apex domain; platform credentials are verified before tenant lookup)
- CSRF cookie issued on sign-in; HTTP-only access/refresh cookies; rate limiting on `/api/auth/login`
- JWT flag `isPlatform: true`, role `superadmin`, `schoolId: null`
- All `/api/platform/*` routes require `requirePlatformAdmin`
- Same security headers (CSP, HSTS, etc.) as the main app — verify on **Health**

## Setup

```bash
npx prisma db push
npm run seed:platform-admin
```

Set `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` in production.

## Province and district (required at onboarding)

Every school must select a **province** and **district** during onboarding. The system assigns a **reporting stream key** (`province-slug__district-slug`) so schools in the same area are grouped for monitoring and future delegated admin roles:

- **Province admin** (future) — all streams in one province
- **District admin** (future) — one stream (province + district)

Super-admins can edit province/district on the Schools table; the stream key updates automatically.

API filters: `GET /api/platform/schools?province=&district=&stream=`
