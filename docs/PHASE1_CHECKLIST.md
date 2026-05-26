# Phase 1 completion checklist

Run this before starting **Phase 2** ([PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)).

---

## Build & tests

- [ ] `npm install` completes without errors
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma db push` (or `migrate deploy`) applied on target DB
- [ ] `npm run build` completes with **0 errors**
- [ ] `npm test` passes (**32+** tests, 0 failures)
- [ ] `npm run lint` passes (or only known warnings)
- [ ] `npm run docs:api-routes` regenerates [API_ROUTES.md](./API_ROUTES.md)

---

## Runtime smoke tests

- [ ] `GET /api/health` → `200` with `status: "healthy"`
- [ ] Login works in browser (school subdomain or localhost)
- [ ] Lesson plan generates (CBC stream or Ministry format)
- [ ] `POST /api/assessments/sba-tasks` with `formLevel: 4` → **400** (Form 4 blocked)
- [ ] QR: `POST /api/attendance/qr-generate` → scan `/attend?t=...` → mark present
- [ ] Billing: plan cards show prices; payment panel accepts phone number
- [ ] Sentry test error visible (production DSN + `/sentry-example-page`)

---

## Documentation (Task 8)

- [ ] [docs/README.md](./README.md) — index
- [ ] [docs/SETUP.md](./SETUP.md) — local setup
- [ ] [docs/ENVIRONMENT.md](./ENVIRONMENT.md) — env vars
- [ ] [docs/DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — contributor guide
- [ ] [docs/TESTING.md](./TESTING.md)
- [ ] [docs/AI_GUIDE.md](./AI_GUIDE.md)
- [ ] [docs/ECZ_COMPLIANCE.md](./ECZ_COMPLIANCE.md)
- [ ] [docs/SMS_GUIDE.md](./SMS_GUIDE.md)
- [ ] [docs/QR_ATTENDANCE.md](./QR_ATTENDANCE.md)
- [ ] [docs/API_ROUTES.md](./API_ROUTES.md)
- [ ] [CHANGELOG.md](../CHANGELOG.md) — all tasks 1–8 noted

---

## Configuration

- [ ] `.env.example` lists every variable from [ENVIRONMENT.md](./ENVIRONMENT.md)
- [ ] Production: `JWT_SECRET` set (≥ 32 chars)
- [ ] Production: `GROQ_API_KEY`, `RESEND_API_KEY`, `DATABASE_URL`
- [ ] No `@ai-sdk/anthropic` in `package.json`
- [ ] `npm run seed:ecz` — 12 competencies + 16 subjects without error

---

## Sign-off

| Role     | Name | Date |
| -------- | ---- | ---- |
| Dev lead |      |      |
| QA       |      |      |

When all boxes are checked, proceed to [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md).
