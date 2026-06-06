# ZSMS Individual Portal

The Individual Portal lets **solo teachers** and **independent students** use ZSMS without a subscribing school.

## Subscriber types

| Type         | Role          | Plan                                      |
| ------------ | ------------- | ----------------------------------------- |
| Solo teacher | `teacher`     | `individual_free` or `individual_premium` |
| Solo student | `student`     | `student_free` (always free)              |
| School       | `headteacher` | Existing school plans (unchanged)         |

## Architecture: school of one

Each individual subscriber gets a normal `School` row with `schoolType: INDIVIDUAL`. All existing APIs remain `schoolId`-scoped.

- Solo teacher workspace: auto subdomain, `ownerUserId`, `enrollmentCode` for student invites
- Solo student (no tutor): separate `INDIVIDUAL` school with `plan: student_free`
- Student with tutor: joins teacher workspace via enrollment code

## Onboarding URLs

- `/join` — solo teacher (Free or Premium)
- `/join/student` — student signup (optional `?code=XXXXXX`)
- `/onboarding` — full school signup (unchanged)

## Dashboard

- Solo teachers: `/dashboard/solo`
- Students: `/dashboard/student` (unchanged)

## API routes

| Method | Path                                   | Purpose             |
| ------ | -------------------------------------- | ------------------- |
| GET    | `/api/solo/dashboard`                  | Workspace stats     |
| GET    | `/api/solo/enrollment-code`            | Current invite code |
| POST   | `/api/solo/enrollment-code/regenerate` | New invite code     |
| GET    | `/api/solo/students`                   | Enrolled students   |
| DELETE | `/api/solo/students/[id]`              | Remove student      |
| POST   | `/api/onboarding/student`              | Student self-signup |

## Plan gating

Feature access uses existing `requireFeature()` + `PLAN_FEATURES` in `lib/zambiaSchoolFeatures.js`.

- `individual_free`: ECZ practice, whiteboard, lab, code playground — no AI generation
- `individual_premium`: adds AI lesson planner, quiz maker, story weaver, report comments, attendance
- `student_free`: ECZ practice and creative tools only

School-only features (timetable, bulk SMS, MOE reports, HOD workflows) return 403 for `INDIVIDUAL` schools via `requireSchoolType()`.

## Database migration

From the **web project root** (not `zsms-mobile`):

```bash
npx prisma migrate deploy
npx prisma generate
```

## Upgrade path

Solo teachers upgrade via `/dashboard/billing` using `individual_premium` (Lipila mobile money).
