# ZSMS API Routes Reference

> Auto-generated — do not edit by hand. Regenerate with:
>
> ```bash
> npm run docs:api-routes
> ```

Generated: 2026-05-26T20:50:55.538Z

Total route files: **216**

## Quick index

| Prefix                      | Count |
| --------------------------- | ----: |
| `/api/account`              |     2 |
| `/api/admin`                |    15 |
| `/api/ai`                   |     7 |
| `/api/aiml`                 |     5 |
| `/api/allocations`          |     7 |
| `/api/assessments`          |     4 |
| `/api/assignments`          |     2 |
| `/api/attendance`           |     5 |
| `/api/auth`                 |     8 |
| `/api/billing`              |     1 |
| `/api/classes`              |     5 |
| `/api/creative-features`    |     1 |
| `/api/dashboard`            |    19 |
| `/api/departments`          |     1 |
| `/api/ecz`                  |    10 |
| `/api/features`             |     1 |
| `/api/feedback`             |     1 |
| `/api/field-trips`          |     1 |
| `/api/health`               |     1 |
| `/api/hods`                 |     3 |
| `/api/lesson-plans`         |     8 |
| `/api/mobile`               |    11 |
| `/api/onboarding`           |     8 |
| `/api/payments`             |     2 |
| `/api/ping`                 |     1 |
| `/api/platform`             |     5 |
| `/api/profile`              |     4 |
| `/api/public`               |     5 |
| `/api/question-bank`        |     2 |
| `/api/recipes`              |     5 |
| `/api/school`               |     1 |
| `/api/schools`              |     3 |
| `/api/sentry-example-api`   |     1 |
| `/api/sms`                  |     4 |
| `/api/strategic-goals`      |     2 |
| `/api/strategic-reviews`    |     1 |
| `/api/student`              |     5 |
| `/api/student-works`        |     1 |
| `/api/students`             |     4 |
| `/api/subjects`             |     3 |
| `/api/teacher`              |     5 |
| `/api/teacher-performance`  |     4 |
| `/api/teachers`             |     3 |
| `/api/teaching-assignments` |     1 |
| `/api/timetable`            |    19 |
| `/api/users`                |     3 |
| `/api/v1`                   |     6 |

---

## /api/account

| Method | Route                          | Summary |
| ------ | ------------------------------ | ------- |
| POST   | `/api/account/password`        | —       |
| POST   | `/api/account/profile-picture` | —       |

## /api/admin

| Method    | Route                                           | Summary |
| --------- | ----------------------------------------------- | ------- |
| POST      | `/api/admin/allocations/:allocationId/approve`  | —       |
| POST      | `/api/admin/allocations/:allocationId/reject`   | —       |
| GET       | `/api/admin/allocations/:allocationId/review`   | —       |
| GET       | `/api/admin/allocations/pending`                | —       |
| GET       | `/api/admin/diagnostics/students`               | —       |
| GET       | `/api/admin/export/users`                       | —       |
| GET       | `/api/admin/master-timetable`                   | —       |
| GET       | `/api/admin/notifications`                      | —       |
| POST      | `/api/admin/notifications/:notificationId/read` | —       |
| POST      | `/api/admin/repair/backfill-class-ids`          | —       |
| POST      | `/api/admin/repair/backfill-result-entered-by`  | —       |
| POST      | `/api/admin/repair/clear-default-classes`       | —       |
| POST      | `/api/admin/repair/enrollments`                 | —       |
| POST      | `/api/admin/repair/normalize-classes`           | —       |
| GET, POST | `/api/admin/schools`                            | —       |

## /api/ai

| Method | Route                         | Summary |
| ------ | ----------------------------- | ------- |
| POST   | `/api/ai/competency-analyzer` | —       |
| POST   | `/api/ai/ecz-practice`        | —       |
| POST   | `/api/ai/lesson-planner`      | —       |
| POST   | `/api/ai/phonics-trainer`     | —       |
| POST   | `/api/ai/quiz-maker`          | —       |
| POST   | `/api/ai/report-comments`     | —       |
| POST   | `/api/ai/story-weaver`        | —       |

## /api/aiml

| Method | Route                       | Summary |
| ------ | --------------------------- | ------- |
| POST   | `/api/aiml/ecz-practice`    | —       |
| POST   | `/api/aiml/lesson-planner`  | —       |
| POST   | `/api/aiml/quiz-maker`      | —       |
| POST   | `/api/aiml/report-comments` | —       |
| POST   | `/api/aiml/story-weaver`    | —       |

## /api/allocations

| Method      | Route                                   | Summary |
| ----------- | --------------------------------------- | ------- |
| GET, DELETE | `/api/allocations/:allocationId`        | —       |
| POST        | `/api/allocations/:allocationId/submit` | —       |
| PUT         | `/api/allocations/:allocationId/update` | —       |
| POST        | `/api/allocations/create`               | —       |
| GET         | `/api/allocations/department-classes`   | —       |
| GET         | `/api/allocations/department-subjects`  | —       |
| GET         | `/api/allocations/my-department`        | —       |

## /api/assessments

| Method           | Route                         | Summary |
| ---------------- | ----------------------------- | ------- |
| GET, POST        | `/api/assessments`            | —       |
| GET, PUT, DELETE | `/api/assessments/:id`        | —       |
| GET, POST        | `/api/assessments/sba-scores` | —       |
| GET, POST        | `/api/assessments/sba-tasks`  | —       |

## /api/assignments

| Method           | Route                  | Summary |
| ---------------- | ---------------------- | ------- |
| GET, POST        | `/api/assignments`     | —       |
| GET, PUT, DELETE | `/api/assignments/:id` | —       |

## /api/attendance

| Method    | Route                         | Summary                                                                                                                                                                                 |
| --------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST | `/api/attendance`             | —                                                                                                                                                                                       |
| POST      | `/api/attendance/qr-generate` | POST /api/attendance/qr-generate Teacher starts a QR attendance session. Returns QR image and session details. BODY: { classId, subjectId, periodLabel?, term?, academicYear?, shift? } |
| GET       | `/api/attendance/qr-info`     | GET /api/attendance/qr-info?t={token} Public: session context + roster for the /attend mobile page.                                                                                     |
| POST      | `/api/attendance/qr-mark`     | POST /api/attendance/qr-mark Student marks present via QR token (no auth cookie required). BODY: { token, studentName? } or { token, studentId }                                        |
| GET       | `/api/attendance/stats`       | —                                                                                                                                                                                       |

## /api/auth

| Method        | Route                             | Summary |
| ------------- | --------------------------------- | ------- |
| POST          | `/api/auth/forgot-password`       | —       |
| POST          | `/api/auth/login`                 | —       |
| POST, OPTIONS | `/api/auth/logout`                | —       |
| GET           | `/api/auth/me`                    | —       |
| POST          | `/api/auth/refresh`               | —       |
| POST          | `/api/auth/register`              | —       |
| POST          | `/api/auth/reset-password`        | —       |
| POST          | `/api/auth/reset-password/:token` | —       |

## /api/billing

| Method | Route                               | Summary |
| ------ | ----------------------------------- | ------- |
| POST   | `/api/billing/subscription-payment` | —       |

## /api/classes

| Method           | Route                                 | Summary |
| ---------------- | ------------------------------------- | ------- |
| GET, POST        | `/api/classes`                        | —       |
| GET, PUT, DELETE | `/api/classes/:id`                    | —       |
| GET              | `/api/classes/:id/students`           | —       |
| POST             | `/api/classes/bulk-assign-department` | —       |
| GET              | `/api/classes/students`               | —       |

## /api/creative-features

| Method | Route                    | Summary |
| ------ | ------------------------ | ------- |
| GET    | `/api/creative-features` | —       |

## /api/dashboard

| Method       | Route                                           | Summary |
| ------------ | ----------------------------------------------- | ------- |
| GET          | `/api/dashboard/academic-management`            | —       |
| GET          | `/api/dashboard/exam-tracking`                  | —       |
| GET          | `/api/dashboard/headteacher`                    | —       |
| GET, POST    | `/api/dashboard/headteacher/attendance/chronic` | —       |
| GET          | `/api/dashboard/headteacher/attendance/live`    | —       |
| GET          | `/api/dashboard/headteacher/classes`            | —       |
| GET          | `/api/dashboard/hod`                            | —       |
| GET          | `/api/dashboard/hod/exam-analysis`              | —       |
| GET          | `/api/dashboard/hod/teacher-performance`        | —       |
| GET          | `/api/dashboard/hod/teacher-performance/export` | —       |
| GET, PATCH   | `/api/dashboard/hod/teacher-progress`           | —       |
| GET          | `/api/dashboard/moe-reports`                    | —       |
| GET, OPTIONS | `/api/dashboard/stats`                          | —       |
| GET          | `/api/dashboard/stem-performance`               | —       |
| GET          | `/api/dashboard/student`                        | —       |
| GET          | `/api/dashboard/student/games`                  | —       |
| GET, OPTIONS | `/api/dashboard/teacher`                        | —       |
| GET          | `/api/dashboard/teacher/assessments-analytics`  | —       |
| GET          | `/api/dashboard/teacher/department-analysis`    | —       |

## /api/departments

| Method | Route              | Summary |
| ------ | ------------------ | ------- |
| GET    | `/api/departments` | —       |

## /api/ecz

| Method        | Route                              | Summary                                                                             |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| GET, POST     | `/api/ecz/accommodations`          | —                                                                                   |
| PATCH, DELETE | `/api/ecz/accommodations/:id`      | —                                                                                   |
| GET, POST     | `/api/ecz/evidence`                | —                                                                                   |
| DELETE        | `/api/ecz/evidence/:id`            | —                                                                                   |
| GET           | `/api/ecz/evidence/file/:filename` | —                                                                                   |
| GET           | `/api/ecz/reference`               | GET /api/ecz/reference — ECZ competencies and CBC subject constructs (seeded data). |
| POST          | `/api/ecz/rubric/generate`         | —                                                                                   |
| GET           | `/api/ecz/scores`                  | Lightweight list of SBA score rows for evidence upload picker.                      |
| GET, POST     | `/api/ecz/subjects/seed`           | Seed ECZ subjects and construct elements for the current school.                    |
| GET, POST     | `/api/ecz/submissions`             | —                                                                                   |

## /api/features

| Method | Route                        | Summary |
| ------ | ---------------------------- | ------- |
| POST   | `/api/features/check-access` | —       |

## /api/feedback

| Method           | Route           | Summary                                                    |
| ---------------- | --------------- | ---------------------------------------------------------- |
| GET, POST, PATCH | `/api/feedback` | GET /api/feedback — List feedback (admin/headteacher only) |

## /api/field-trips

| Method    | Route              | Summary |
| --------- | ------------------ | ------- |
| GET, POST | `/api/field-trips` | —       |

## /api/health

| Method | Route         | Summary                                                                                                                                                  |
| ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health` | GET /api/health Health check endpoint for monitoring and deployment verification. Returns status of: database, email (Resend), AI (Groq), SMS, payments. |

## /api/hods

| Method           | Route              | Summary |
| ---------------- | ------------------ | ------- |
| GET              | `/api/hods`        | —       |
| GET, PUT, DELETE | `/api/hods/:id`    | —       |
| POST, DELETE     | `/api/hods/assign` | —       |

## /api/lesson-plans

| Method          | Route                            | Summary |
| --------------- | -------------------------------- | ------- |
| GET, POST       | `/api/lesson-plans`              | —       |
| GET, PUT, PATCH | `/api/lesson-plans/:id`          | —       |
| GET, POST       | `/api/lesson-plans/:id/comments` | —       |
| GET             | `/api/lesson-plans/:id/export`   | —       |
| POST            | `/api/lesson-plans/:id/submit`   | —       |
| GET             | `/api/lesson-plans/context`      | —       |
| POST            | `/api/lesson-plans/generate`     | —       |
| GET             | `/api/lesson-plans/hod/pending`  | —       |

## /api/mobile

| Method    | Route                                             | Summary                                               |
| --------- | ------------------------------------------------- | ----------------------------------------------------- |
| GET, POST | `/api/mobile/attendance/sessions`                 | —                                                     |
| POST      | `/api/mobile/attendance/sessions/:id/close`       | —                                                     |
| POST      | `/api/mobile/attendance/sessions/:id/marks`       | —                                                     |
| POST      | `/api/mobile/attendance/sessions/:id/twin-verify` | —                                                     |
| POST      | `/api/mobile/attendance/verify-face`              | —                                                     |
| POST      | `/api/mobile/auth/login`                          | —                                                     |
| POST      | `/api/mobile/auth/refresh`                        | —                                                     |
| GET       | `/api/mobile/class-roster`                        | —                                                     |
| GET       | `/api/mobile/school/lookup`                       | Public: validate school subdomain before mobile login |
| GET       | `/api/mobile/session-context`                     | —                                                     |
| POST      | `/api/mobile/sync`                                | —                                                     |

## /api/onboarding

| Method    | Route                                 | Summary |
| --------- | ------------------------------------- | ------- |
| POST      | `/api/onboarding/complete`            | —       |
| GET, POST | `/api/onboarding/lipila/callback`     | —       |
| POST      | `/api/onboarding/pay`                 | —       |
| POST      | `/api/onboarding/resend-verification` | —       |
| POST      | `/api/onboarding/select-plan`         | —       |
| POST      | `/api/onboarding/start`               | —       |
| GET       | `/api/onboarding/status`              | —       |
| GET       | `/api/onboarding/verify/:token`       | —       |

## /api/payments

| Method    | Route                           | Summary |
| --------- | ------------------------------- | ------- |
| GET, POST | `/api/payments/lipila/callback` | —       |
| POST      | `/api/payments/mobile-money`    | —       |

## /api/ping

| Method | Route       | Summary                                                                              |
| ------ | ----------- | ------------------------------------------------------------------------------------ |
| GET    | `/api/ping` | Minimal liveness check - no imports, no DB. Use for Vercel / container healthchecks. |

## /api/platform

| Method     | Route                        | Summary                                                                       |
| ---------- | ---------------------------- | ----------------------------------------------------------------------------- |
| POST       | `/api/platform/auth/login`   | —                                                                             |
| GET        | `/api/platform/auth/me`      | —                                                                             |
| GET, PATCH | `/api/platform/auth/profile` | —                                                                             |
| GET        | `/api/platform/schools`      | List affiliated, paid schools — metadata and counts only (no school records). |
| PATCH      | `/api/platform/schools/:id`  | Patch tenant billing flags only — never expose or modify academic data.       |

## /api/profile

| Method | Route                                 | Summary |
| ------ | ------------------------------------- | ------- |
| PUT    | `/api/profile/details`                | —       |
| PUT    | `/api/profile/password`               | —       |
| PUT    | `/api/profile/picture`                | —       |
| GET    | `/api/profile/picture/file/:filename` | —       |

## /api/public

| Method | Route                        | Summary |
| ------ | ---------------------------- | ------- |
| POST   | `/api/public/contact`        | —       |
| GET    | `/api/public/features`       | —       |
| GET    | `/api/public/feedback`       | —       |
| GET    | `/api/public/platform-stats` | —       |
| GET    | `/api/public/schools`        | —       |

## /api/question-bank

| Method      | Route                    | Summary |
| ----------- | ------------------------ | ------- |
| GET, POST   | `/api/question-bank`     | —       |
| PUT, DELETE | `/api/question-bank/:id` | —       |

## /api/recipes

| Method | Route                       | Summary |
| ------ | --------------------------- | ------- |
| GET    | `/api/recipes`              | —       |
| PUT    | `/api/recipes/:id`          | —       |
| POST   | `/api/recipes/:id/validate` | —       |
| POST   | `/api/recipes/create`       | —       |
| POST   | `/api/recipes/validate`     | —       |

## /api/school

| Method | Route                 | Summary |
| ------ | --------------------- | ------- |
| GET    | `/api/school/current` | —       |

## /api/schools

| Method | Route                          | Summary |
| ------ | ------------------------------ | ------- |
| GET    | `/api/schools/check-subdomain` | —       |
| POST   | `/api/schools/register`        | —       |
| GET    | `/api/schools/verify/:token`   | —       |

## /api/sentry-example-api

| Method | Route                     | Summary |
| ------ | ------------------------- | ------- |
| —      | `/api/sentry-example-api` | —       |

## /api/sms

| Method | Route               | Summary |
| ------ | ------------------- | ------- |
| POST   | `/api/sms/delivery` | —       |
| POST   | `/api/sms/inbound`  | —       |
| GET    | `/api/sms/logs`     | —       |
| POST   | `/api/sms/send`     | —       |

## /api/strategic-goals

| Method      | Route                      | Summary |
| ----------- | -------------------------- | ------- |
| GET, POST   | `/api/strategic-goals`     | —       |
| PUT, DELETE | `/api/strategic-goals/:id` | —       |

## /api/strategic-reviews

| Method    | Route                    | Summary |
| --------- | ------------------------ | ------- |
| GET, POST | `/api/strategic-reviews` | —       |

## /api/student

| Method                 | Route                      | Summary |
| ---------------------- | -------------------------- | ------- |
| GET                    | `/api/student/assessments` | —       |
| GET, POST, PUT, DELETE | `/api/student/goals`       | —       |
| GET, POST              | `/api/student/materials`   | —       |
| GET                    | `/api/student/results`     | —       |
| GET                    | `/api/student/subjects`    | —       |

## /api/student-works

| Method    | Route                | Summary |
| --------- | -------------------- | ------- |
| GET, POST | `/api/student-works` | —       |

## /api/students

| Method           | Route                               | Summary |
| ---------------- | ----------------------------------- | ------- |
| GET, POST        | `/api/students`                     | —       |
| GET, PUT, DELETE | `/api/students/:id`                 | —       |
| POST             | `/api/students/:id/face-enrollment` | —       |
| POST             | `/api/students/:id/twin-pin`        | —       |

## /api/subjects

| Method           | Route                       | Summary |
| ---------------- | --------------------------- | ------- |
| GET, POST        | `/api/subjects`             | —       |
| GET, PUT, DELETE | `/api/subjects/:id`         | —       |
| GET              | `/api/subjects/by-category` | —       |

## /api/teacher

| Method            | Route                         | Summary                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST         | `/api/teacher/materials`      | —                                                                                                                                                                                                                                                       |
| PUT, DELETE       | `/api/teacher/materials/:id`  | —                                                                                                                                                                                                                                                       |
| GET               | `/api/teacher/pupils`         | —                                                                                                                                                                                                                                                       |
| GET, POST, DELETE | `/api/teacher/results`        | DELETE must use the same assignment rules as POST. Teachers often have Class/Subject links without TeachingAssignment rows; the previous implementation only checked TeachingAssignment and returned 403 after successful saves via profile assignment. |
| GET               | `/api/teacher/results/export` | —                                                                                                                                                                                                                                                       |

## /api/teacher-performance

| Method | Route                                                     | Summary |
| ------ | --------------------------------------------------------- | ------- |
| GET    | `/api/teacher-performance/observation-tools`              | —       |
| POST   | `/api/teacher-performance/observations`                   | —       |
| GET    | `/api/teacher-performance/teachers/:id/detailed-analysis` | —       |
| GET    | `/api/teacher-performance/teachers/:id/summary`           | —       |

## /api/teachers

| Method           | Route                           | Summary |
| ---------------- | ------------------------------- | ------- |
| GET, PUT, DELETE | `/api/teachers`                 | —       |
| GET, PUT, DELETE | `/api/teachers/:id`             | —       |
| GET, PUT         | `/api/teachers/:id/departments` | —       |

## /api/teaching-assignments

| Method    | Route                       | Summary |
| --------- | --------------------------- | ------- |
| GET, POST | `/api/teaching-assignments` | —       |

## /api/timetable

| Method             | Route                                      | Summary                                                                                                        |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| GET, POST          | `/api/timetable/allocations`               | —                                                                                                              |
| DELETE             | `/api/timetable/allocations/:id`           | —                                                                                                              |
| POST               | `/api/timetable/allocations/push`          | —                                                                                                              |
| POST               | `/api/timetable/assignTeacherToPeriod`     | —                                                                                                              |
| GET                | `/api/timetable/classes`                   | —                                                                                                              |
| GET, POST          | `/api/timetable/config`                    | —                                                                                                              |
| GET, PATCH, DELETE | `/api/timetable/entries`                   | —                                                                                                              |
| GET, POST          | `/api/timetable/generate`                  | —                                                                                                              |
| GET, POST          | `/api/timetable/notifications`             | —                                                                                                              |
| GET                | `/api/timetable/periods`                   | —                                                                                                              |
| POST               | `/api/timetable/publish`                   | —                                                                                                              |
| POST               | `/api/timetable/solver/generate`           | POST /api/timetable/solver/generate Greedy timetable solver — runs on Vercel + Neon with no external services. |
| GET, POST          | `/api/timetable/teacher-colors`            | —                                                                                                              |
| PUT                | `/api/timetable/teacher-colors/:teacherId` | —                                                                                                              |
| GET                | `/api/timetable/teacherPeriodAssignments`  | —                                                                                                              |
| GET                | `/api/timetable/timeSlots`                 | —                                                                                                              |
| PATCH              | `/api/timetable/timeSlots/:id`             | —                                                                                                              |
| POST               | `/api/timetable/version/publish`           | Legacy TimetableVersion publish (separate from TimetableAllocationEntry publish).                              |
| GET                | `/api/timetable/view`                      | —                                                                                                              |

## /api/users

| Method           | Route                     | Summary |
| ---------------- | ------------------------- | ------- |
| GET              | `/api/users`              | —       |
| GET, PUT, DELETE | `/api/users/:id`          | —       |
| POST             | `/api/users/:id/password` | —       |

## /api/v1

| Method | Route                                                        | Summary |
| ------ | ------------------------------------------------------------ | ------- |
| —      | `/api/v1/subjects/by-category`                               | —       |
| —      | `/api/v1/teacher-performance/observation-tools`              | —       |
| —      | `/api/v1/teacher-performance/observations`                   | —       |
| —      | `/api/v1/teacher-performance/teachers/:id/detailed-analysis` | —       |
| —      | `/api/v1/teacher-performance/teachers/:id/summary`           | —       |
| —      | `/api/v1/users`                                              | —       |

---

## Conventions

- Most routes require auth cookie + school tenant context.
- Public: `/api/health`, `/api/auth/login`, `/api/attendance/qr-*`, `/api/public/*`.
- Platform admin: `/api/platform/*`.
- Mobile: `/api/mobile/*`.
