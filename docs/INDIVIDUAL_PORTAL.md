# ZSMS Individual Portal

The Individual Portal lets **solo teachers** and **independent students** use ZSMS without a subscribing school.

## Subscriber types

| Type         | Role          | Plan                                                 |
| ------------ | ------------- | ---------------------------------------------------- |
| Solo teacher | `teacher`     | `individual` (K50/mo) or `individual_premium`        |
| Solo student | `student`     | `student_premium` (K99/mo) or `student_free` starter |
| School       | `headteacher` | Existing school plans (unchanged)                    |

## Free trial (all roles)

Every account — school, solo teacher, or student — gets a **2-month free trial** (`trialEndsAt`). After that, **subscription is required** via `/dashboard/billing` (Lipila mobile money). There are no permanently free plans.

## Pricing after trial

- **Individual teacher (`individual`)**: K50/month — up to 5 students, ECZ tools.
- **Individual premium (`individual_premium`)**: K99/month — unlimited students + AI tools.
- **Student premium (`student_premium`)**: K99/month — student-facing dashboard only.
- **Student starter (`student_free`)**: core ECZ practice during trial; subscribe to continue.

## Onboarding URLs

**Verify email → Start 2-month trial → Subscribe when trial ends**

- `/join` — solo teacher
- `/join/student` — student signup (optional `?code=XXXXXX`)
- `/onboarding` — full school signup

## Dashboard

- Solo teachers: `/dashboard/solo`
- Students: `/dashboard/student`

## Plan gating

Feature access uses `requireFeature()` + `PLAN_FEATURES` in `lib/zambiaSchoolFeatures.js`. Access also requires an active trial or paid subscription (`lib/billing/subscription.js`).

## Database migration

From the **web project root** (not `zsms-mobile`):

```bash
npx prisma migrate deploy
npx prisma generate
```

## Renewal

All roles renew or upgrade via `/dashboard/billing` after the 2-month trial.
