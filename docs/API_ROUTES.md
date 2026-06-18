# ZSMS API Routes Reference

> Auto-generated — do not edit by hand. Regenerate with:
>
> ```bash
> npm run docs:api-routes
> ```

Generated: 2026-06-18T10:13:01.531Z

Total route files: **326**

## Quick index

| Prefix                      | Count |
| --------------------------- | ----: |
| `/api/account`              |     2 |
| `/api/activities`           |     4 |
| `/api/admin`                |    15 |
| `/api/ai`                   |    11 |
| `/api/aiml`                 |     5 |
| `/api/allocations`          |     7 |
| `/api/analytics`            |     1 |
| `/api/assessments`          |    13 |
| `/api/assignments`          |     4 |
| `/api/attendance`           |     8 |
| `/api/auth`                 |     8 |
| `/api/billing`              |     1 |
| `/api/career-clusters`      |     2 |
| `/api/careers`              |     2 |
| `/api/cbc`                  |     2 |
| `/api/classes`              |     5 |
| `/api/code-playground`      |     1 |
| `/api/creative-features`    |     1 |
| `/api/cron`                 |     2 |
| `/api/csp-report`           |     1 |
| `/api/csrf-token`           |     1 |
| `/api/dashboard`            |    24 |
| `/api/departments`          |     1 |
| `/api/ecz`                  |    14 |
| `/api/features`             |     1 |
| `/api/feedback`             |     1 |
| `/api/field-trips`          |     1 |
| `/api/games`                |     2 |
| `/api/health`               |     1 |
| `/api/hod`                  |    11 |
| `/api/hods`                 |     3 |
| `/api/hostel`               |     2 |
| `/api/innovation`           |     2 |
| `/api/lesson-plans`         |     8 |
| `/api/marketplace`          |     7 |
| `/api/materials`            |     5 |
| `/api/mobile`               |    12 |
| `/api/onboarding`           |     9 |
| `/api/payments`             |     2 |
| `/api/ping`                 |     1 |
| `/api/platform`             |    13 |
| `/api/profile`              |     4 |
| `/api/public`               |     6 |
| `/api/question-bank`        |     2 |
| `/api/recipes`              |     5 |
| `/api/school`               |     1 |
| `/api/schools`              |     3 |
| `/api/sentry-example-api`   |     1 |
| `/api/sms`                  |     9 |
| `/api/solo`                 |     6 |
| `/api/strategic-goals`      |     2 |
| `/api/strategic-reviews`    |     1 |
| `/api/student`              |    12 |
| `/api/student-works`        |     1 |
| `/api/students`             |     4 |
| `/api/subjects`             |     3 |
| `/api/teacher`              |     6 |
| `/api/teacher-performance`  |     4 |
| `/api/teachers`             |     3 |
| `/api/teaching-assignments` |     1 |
| `/api/timetable`            |    24 |
| `/api/transport`            |     2 |
| `/api/users`                |     3 |
| `/api/ussd`                 |     1 |
| `/api/v1`                   |     6 |

---

## /api/account

| Method | Route                          | Summary |
| ------ | ------------------------------ | ------- |
| POST   | `/api/account/password`        | —       |
| POST   | `/api/account/profile-picture` | —       |

## /api/activities

| Method             | Route                              | Summary |
| ------------------ | ---------------------------------- | ------- |
| GET, POST          | `/api/activities`                  | —       |
| GET, PATCH, DELETE | `/api/activities/:id`              | —       |
| POST, DELETE       | `/api/activities/:id/participants` | —       |
| GET                | `/api/activities/mine`             | —       |

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

| Method    | Route                         | Summary                                                                      |
| --------- | ----------------------------- | ---------------------------------------------------------------------------- |
| POST      | `/api/ai/competency-analyzer` | —                                                                            |
| POST      | `/api/ai/ecz-exam-questions`  | —                                                                            |
| POST      | `/api/ai/ecz-practice`        | —                                                                            |
| POST      | `/api/ai/lesson-planner`      | —                                                                            |
| POST      | `/api/ai/phonics-trainer`     | —                                                                            |
| POST      | `/api/ai/quiz-maker`          | —                                                                            |
| POST      | `/api/ai/report-comments`     | —                                                                            |
| POST      | `/api/ai/story-weaver`        | —                                                                            |
| POST      | `/api/ai/study-assistant`     | POST /api/ai/study-assistant — RAG-grounded Q&A for students (Phase 3 P3.6). |
| GET, POST | `/api/ai/term-reports`        | GET — list term reports. POST — generate for a student.                      |
| PATCH     | `/api/ai/term-reports/:id`    | PATCH /api/ai/term-reports/[id] — HOD approve / publish.                     |

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

## /api/analytics

| Method | Route                                | Summary                                                                                                                           |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/analytics/national-percentile` | Anonymous national percentile for a student's mock exam score. Aggregates across all schools — no individual identities returned. |

## /api/assessments

| Method           | Route                                | Summary |
| ---------------- | ------------------------------------ | ------- |
| GET, POST        | `/api/assessments`                   | —       |
| GET, PUT, DELETE | `/api/assessments/:id`               | —       |
| GET, POST        | `/api/assessments/:id/ai-analysis`   | —       |
| GET              | `/api/assessments/:id/attempts`      | —       |
| POST             | `/api/assessments/:id/publish`       | —       |
| GET, PUT         | `/api/assessments/:id/questions`     | —       |
| PATCH            | `/api/assessments/:id/review`        | —       |
| POST             | `/api/assessments/:id/submit-hod`    | —       |
| GET              | `/api/assessments/hod/pending`       | —       |
| POST             | `/api/assessments/promote-term-test` | —       |
| GET, POST        | `/api/assessments/sba-scores`        | —       |
| GET, POST        | `/api/assessments/sba-tasks`         | —       |
| GET              | `/api/assessments/teacher-overview`  | —       |

## /api/assignments

| Method           | Route                              | Summary |
| ---------------- | ---------------------------------- | ------- |
| GET, POST        | `/api/assignments`                 | —       |
| GET, PUT, DELETE | `/api/assignments/:id`             | —       |
| GET, POST        | `/api/assignments/:id/submissions` | —       |
| POST             | `/api/assignments/:id/submit-hod`  | —       |

## /api/attendance

| Method    | Route                            | Summary                                                                                                                                                                                 |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST | `/api/attendance`                | —                                                                                                                                                                                       |
| POST      | `/api/attendance/qr-generate`    | POST /api/attendance/qr-generate Teacher starts a QR attendance session. Returns QR image and session details. BODY: { classId, subjectId, periodLabel?, term?, academicYear?, shift? } |
| GET       | `/api/attendance/qr-info`        | GET /api/attendance/qr-info?t={token} Public: session context + roster for the /attend mobile page.                                                                                     |
| POST      | `/api/attendance/qr-mark`        | POST /api/attendance/qr-mark Student marks present via QR token (no auth cookie required). BODY: { token, studentName? } or { token, studentId }                                        |
| POST      | `/api/attendance/returns/submit` | —                                                                                                                                                                                       |
| GET       | `/api/attendance/sessions`       | GET /api/attendance/sessions?classId=&date=YYYY-MM-DD&subjectId= Lists mobile lesson sessions for the unified web attendance dashboard.                                                 |
| GET       | `/api/attendance/stats`          | —                                                                                                                                                                                       |
| POST      | `/api/attendance/test-sms`       | DEV ONLY — test parent attendance SMS for a student.                                                                                                                                    |

## /api/auth

| Method        | Route                             | Summary                                                                                          |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| POST          | `/api/auth/forgot-password`       | —                                                                                                |
| POST          | `/api/auth/login`                 | —                                                                                                |
| POST, OPTIONS | `/api/auth/logout`                | —                                                                                                |
| GET           | `/api/auth/me`                    | —                                                                                                |
| POST          | `/api/auth/refresh`               | Benign concurrent refresh: old token revoked within this window should not mass-revoke sessions. |
| POST          | `/api/auth/register`              | —                                                                                                |
| POST          | `/api/auth/reset-password`        | —                                                                                                |
| POST          | `/api/auth/reset-password/:token` | —                                                                                                |

## /api/billing

| Method | Route                               | Summary |
| ------ | ----------------------------------- | ------- |
| POST   | `/api/billing/subscription-payment` | —       |

## /api/career-clusters

| Method        | Route                      | Summary |
| ------------- | -------------------------- | ------- |
| GET, POST     | `/api/career-clusters`     | —       |
| PATCH, DELETE | `/api/career-clusters/:id` | —       |

## /api/careers

| Method        | Route              | Summary |
| ------------- | ------------------ | ------- |
| GET, POST     | `/api/careers`     | —       |
| PATCH, DELETE | `/api/careers/:id` | —       |

## /api/cbc

| Method    | Route              | Summary |
| --------- | ------------------ | ------- |
| GET       | `/api/cbc/export`  | —       |
| GET, POST | `/api/cbc/ratings` | —       |

## /api/classes

| Method           | Route                                 | Summary |
| ---------------- | ------------------------------------- | ------- |
| GET, POST        | `/api/classes`                        | —       |
| GET, PUT, DELETE | `/api/classes/:id`                    | —       |
| GET              | `/api/classes/:id/students`           | —       |
| POST             | `/api/classes/bulk-assign-department` | —       |
| GET              | `/api/classes/students`               | —       |

## /api/code-playground

| Method | Route                          | Summary |
| ------ | ------------------------------ | ------- |
| POST   | `/api/code-playground/execute` | —       |

## /api/creative-features

| Method | Route                    | Summary |
| ------ | ------------------------ | ------- |
| GET    | `/api/creative-features` | —       |

## /api/cron

| Method | Route                       | Summary                                                                            |
| ------ | --------------------------- | ---------------------------------------------------------------------------------- |
| GET    | `/api/cron/ecz-reminder`    | GET /api/cron/ecz-reminder — Vercel Cron (15 January). Requires CRON_SECRET.       |
| GET    | `/api/cron/sms-low-balance` | GET /api/cron/sms-low-balance — daily low SMS credit alerts. Requires CRON_SECRET. |

## /api/csp-report

| Method | Route             | Summary                                                                         |
| ------ | ----------------- | ------------------------------------------------------------------------------- |
| POST   | `/api/csp-report` | Dev-only CSP violation reporting endpoint (set CSP_REPORT_URI=/api/csp-report). |

## /api/csrf-token

| Method | Route             | Summary                                                                      |
| ------ | ----------------- | ---------------------------------------------------------------------------- |
| GET    | `/api/csrf-token` | GET /api/csrf-token Issues a CSRF token cookie for double-submit validation. |

## /api/dashboard

| Method     | Route                                           | Summary                                                                                                                                                                              |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET        | `/api/dashboard/academic-management`            | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/analytics/learning`             | GET /api/dashboard/analytics/learning Query: term, academicYear, department (HOD)                                                                                                    |
| GET        | `/api/dashboard/attendance-live`                | GET /api/dashboard/attendance-live Real-time attendance summary for headteacher dashboard (60s cache; ?refresh=1 bypasses).                                                          |
| GET        | `/api/dashboard/exam-tracking`                  | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/headteacher`                    | —                                                                                                                                                                                    |
| GET, POST  | `/api/dashboard/headteacher/attendance/chronic` | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/headteacher/attendance/live`    | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/headteacher/classes`            | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/hod`                            | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/hod/exam-analysis`              | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/hod/teacher-performance`        | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/hod/teacher-performance/export` | —                                                                                                                                                                                    |
| GET, PATCH | `/api/dashboard/hod/teacher-progress`           | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/moe-reports`                    | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/results`                        | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/stats`                          | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/stem-performance`               | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/student`                        | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/student/games`                  | —                                                                                                                                                                                    |
| POST       | `/api/dashboard/student/games/complete`         | POST /api/dashboard/student/games/complete Records a finished game for the student and updates their gamification profile (XP, points, level). This is the write path that makes the |
| GET        | `/api/dashboard/teacher`                        | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/teacher-compliance`             | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/teacher/assessments-analytics`  | —                                                                                                                                                                                    |
| GET        | `/api/dashboard/teacher/department-analysis`    | —                                                                                                                                                                                    |

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
| GET           | `/api/ecz/exemplars`               | —                                                                                   |
| POST          | `/api/ecz/exemplars/:id/clone`     | —                                                                                   |
| POST          | `/api/ecz/marking-scheme/generate` | —                                                                                   |
| GET, PATCH    | `/api/ecz/moderation`              | —                                                                                   |
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

## /api/games

| Method             | Route            | Summary                                                                                   |
| ------------------ | ---------------- | ----------------------------------------------------------------------------------------- |
| GET, POST          | `/api/games`     | GET /api/games — list school games (teacher/HOD/admin) POST /api/games — create quiz game |
| GET, PATCH, DELETE | `/api/games/:id` | —                                                                                         |

## /api/health

| Method | Route         | Summary                                                                                    |
| ------ | ------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/health` | GET /api/health — production health check (no auth). ?live=1 — liveness only (always 200). |

## /api/hod

| Method        | Route                         | Summary |
| ------------- | ----------------------------- | ------- |
| GET, POST     | `/api/hod/budget`             | —       |
| GET, POST     | `/api/hod/correspondence`     | —       |
| PATCH, DELETE | `/api/hod/correspondence/:id` | —       |
| GET, POST     | `/api/hod/daily-routine`      | —       |
| PATCH         | `/api/hod/daily-routine/:id`  | —       |
| GET, POST     | `/api/hod/files`              | —       |
| DELETE        | `/api/hod/files/:id`          | —       |
| GET           | `/api/hod/files/download/:id` | —       |
| GET, POST     | `/api/hod/meetings`           | —       |
| PATCH         | `/api/hod/meetings/:id`       | —       |
| GET, POST     | `/api/hod/stock`              | —       |

## /api/hods

| Method           | Route              | Summary |
| ---------------- | ------------------ | ------- |
| GET              | `/api/hods`        | —       |
| GET, PUT, DELETE | `/api/hods/:id`    | —       |
| POST, DELETE     | `/api/hods/assign` | —       |

## /api/hostel

| Method       | Route                     | Summary |
| ------------ | ------------------------- | ------- |
| POST, DELETE | `/api/hostel/assignments` | —       |
| GET, POST    | `/api/hostel/rooms`       | —       |

## /api/innovation

| Method        | Route                          | Summary |
| ------------- | ------------------------------ | ------- |
| GET, POST     | `/api/innovation/projects`     | —       |
| PATCH, DELETE | `/api/innovation/projects/:id` | —       |

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

## /api/marketplace

| Method | Route                           | Summary                                                                                                                                                                                    |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/marketplace`              | GET /api/marketplace Public browse/search of approved shared materials. No auth required — lets prospective schools browse before signing up. School identity is never                     |
| GET    | `/api/marketplace/:id`          | GET /api/marketplace/:id Public full preview of an approved shared material, with its recent ratings. Pending/rejected materials are treated as not found for the public.                  |
| POST   | `/api/marketplace/:id/download` | POST /api/marketplace/:id/download A teacher copies an approved shared material into their OWN school's library (as a new DRAFT lesson plan). Increments the material's downloadCount.     |
| POST   | `/api/marketplace/:id/rate`     | POST /api/marketplace/:id/rate Any authenticated teacher rates an approved material (1-5, one per teacher). Re-rating updates the existing score. The cached average is recomputed.        |
| POST   | `/api/marketplace/:id/review`   | POST /api/marketplace/:id/review An HOD/headteacher approves or rejects a marketplace submission from THEIR OWN school. Cross-school review is forbidden (tenant isolation).               |
| GET    | `/api/marketplace/mine`         | GET /api/marketplace/mine - default: the authenticated teacher's own submissions (any status). - ?scope=review (HOD/admin): the school's pending submissions to review.                    |
| POST   | `/api/marketplace/submit`       | POST /api/marketplace/submit A teacher shares one of their own lesson plans to the marketplace. The content is copied server-side from the teacher's record (the body only references it), |

## /api/materials

| Method    | Route                        | Summary                                                                                                                                                              |
| --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET       | `/api/materials`             | GET /api/materials — list RAG school materials for the tenant (with chunk counts). Query: ?subject=Biology — filter by subject; teachers only see assigned subjects. |
| DELETE    | `/api/materials/:id`         | DELETE /api/materials/[id] — remove RAG material and all chunks (tenant-scoped).                                                                                     |
| GET, POST | `/api/materials/blob-upload` | GET — lets the client feature-detect whether direct-to-blob upload is available (i.e. BLOB_READ_WRITE_TOKEN is configured on the server).                            |
| POST      | `/api/materials/ingest`      | POST /api/materials/ingest Body JSON: { materialId, text? } OR multipart: file + metadata fields. Creates SchoolMaterial when materialId omitted.                    |
| GET       | `/api/materials/rag-preview` | GET /api/materials/rag-preview?subject=&topic=&gradeLevel=&materialIds=id1,id2 Retrieval-only preview (no LLM) for teachers before generating a topic test.          |

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
| POST      | `/api/mobile/push/register`                       | —                                                     |
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
| POST      | `/api/onboarding/student`             | —       |
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

| Method        | Route                            | Summary                                                                                 |
| ------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| POST          | `/api/platform/auth/login`       | —                                                                                       |
| GET           | `/api/platform/auth/me`          | —                                                                                       |
| GET, PATCH    | `/api/platform/auth/profile`     | —                                                                                       |
| GET           | `/api/platform/billing/payments` | —                                                                                       |
| GET           | `/api/platform/billing/summary`  | —                                                                                       |
| GET           | `/api/platform/health`           | —                                                                                       |
| GET           | `/api/platform/health/rag`       | —                                                                                       |
| GET           | `/api/platform/schools`          | List affiliated, paid schools — metadata only (no enrollment counts).                   |
| PATCH, DELETE | `/api/platform/schools/:id`      | Patch tenant billing flags and location metadata only.                                  |
| GET           | `/api/platform/stats/districts`  | GET /api/platform/stats/districts?province=Lusaka                                       |
| GET           | `/api/platform/stats/overview`   | —                                                                                       |
| GET           | `/api/platform/stats/provinces`  | —                                                                                       |
| GET           | `/api/platform/stats/streams`    | GET /api/platform/stats/streams — schools grouped by province+district reporting stream |

## /api/profile

| Method | Route                                 | Summary |
| ------ | ------------------------------------- | ------- |
| PUT    | `/api/profile/details`                | —       |
| PUT    | `/api/profile/password`               | —       |
| PUT    | `/api/profile/picture`                | —       |
| GET    | `/api/profile/picture/file/:filename` | —       |

## /api/public

| Method | Route                            | Summary |
| ------ | -------------------------------- | ------- |
| POST   | `/api/public/contact`            | —       |
| GET    | `/api/public/features`           | —       |
| GET    | `/api/public/feedback`           | —       |
| GET    | `/api/public/marketing-homepage` | —       |
| GET    | `/api/public/platform-stats`     | —       |
| GET    | `/api/public/schools`            | —       |

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

| Method     | Route                           | Summary |
| ---------- | ------------------------------- | ------- |
| GET, PATCH | `/api/sms/balance`              | —       |
| POST       | `/api/sms/broadcast`            | —       |
| POST       | `/api/sms/broadcast-dispatcher` | —       |
| POST       | `/api/sms/delivery`             | —       |
| POST       | `/api/sms/inbound`              | —       |
| GET        | `/api/sms/logs`                 | —       |
| POST       | `/api/sms/queue-worker`         | —       |
| GET        | `/api/sms/recipients`           | —       |
| POST       | `/api/sms/send`                 | —       |

## /api/solo

| Method | Route                                  | Summary                                                                                     |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/api/solo/dashboard`                  | —                                                                                           |
| GET    | `/api/solo/enrollment-code`            | —                                                                                           |
| POST   | `/api/solo/enrollment-code/regenerate` | —                                                                                           |
| POST   | `/api/solo/join-with-code`             | Public student self-signup is disabled — students join only via teacher registration + OTC. |
| GET    | `/api/solo/students`                   | —                                                                                           |
| DELETE | `/api/solo/students/:studentId`        | —                                                                                           |

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

| Method                 | Route                                  | Summary |
| ---------------------- | -------------------------------------- | ------- |
| GET                    | `/api/student/assessments`             | —       |
| GET, POST              | `/api/student/flashcards`              | —       |
| POST                   | `/api/student/flashcards/:id/complete` | —       |
| GET, POST, PUT, DELETE | `/api/student/goals`                   | —       |
| GET, POST              | `/api/student/materials`               | —       |
| GET                    | `/api/student/mock-exam`               | —       |
| GET                    | `/api/student/mock-exam/:id`           | —       |
| POST                   | `/api/student/mock-exam/:id/submit`    | —       |
| POST                   | `/api/student/mock-exam/start`         | —       |
| GET                    | `/api/student/notices`                 | —       |
| GET                    | `/api/student/results`                 | —       |
| GET                    | `/api/student/subjects`                | —       |

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

| Method            | Route                                | Summary                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET               | `/api/teacher/department-activities` | —                                                                                                                                                                                                                                                       |
| GET, POST         | `/api/teacher/materials`             | —                                                                                                                                                                                                                                                       |
| PUT, DELETE       | `/api/teacher/materials/:id`         | —                                                                                                                                                                                                                                                       |
| GET               | `/api/teacher/pupils`                | —                                                                                                                                                                                                                                                       |
| GET, POST, DELETE | `/api/teacher/results`               | DELETE must use the same assignment rules as POST. Teachers often have Class/Subject links without TeachingAssignment rows; the previous implementation only checked TeachingAssignment and returned 403 after successful saves via profile assignment. |
| GET               | `/api/teacher/results/export`        | —                                                                                                                                                                                                                                                       |

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

| Method             | Route                                      | Summary                                                                                                                             |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST          | `/api/timetable/allocations`               | —                                                                                                                                   |
| DELETE             | `/api/timetable/allocations/:id`           | —                                                                                                                                   |
| POST               | `/api/timetable/allocations/push`          | —                                                                                                                                   |
| POST               | `/api/timetable/assignTeacherToPeriod`     | —                                                                                                                                   |
| GET                | `/api/timetable/classes`                   | —                                                                                                                                   |
| GET, POST          | `/api/timetable/config`                    | —                                                                                                                                   |
| GET                | `/api/timetable/conflicts`                 | GET /api/timetable/conflicts?term=Term+1&academicYear=2026 Scan draft timetable allocation entries and return structured conflicts. |
| POST               | `/api/timetable/conflicts/resolve`         | POST /api/timetable/conflicts/resolve Apply a resolution action to draft timetable allocation entries.                              |
| POST               | `/api/timetable/conflicts/seed-test`       | POST /api/timetable/conflicts/seed-test Development-only mock conflicts for UI testing.                                             |
| GET, PATCH, DELETE | `/api/timetable/entries`                   | —                                                                                                                                   |
| POST               | `/api/timetable/entries/sync-draft`        | POST /api/timetable/entries/sync-draft Persist in-memory solver/UI assignments to TimetableAllocationEntry (draft).                 |
| GET, POST          | `/api/timetable/generate`                  | —                                                                                                                                   |
| GET, POST          | `/api/timetable/notifications`             | —                                                                                                                                   |
| GET                | `/api/timetable/periods`                   | —                                                                                                                                   |
| POST               | `/api/timetable/publish`                   | —                                                                                                                                   |
| POST               | `/api/timetable/solver/generate`           | POST /api/timetable/solver/generate Greedy timetable solver — runs on Vercel + Neon with no external services.                      |
| POST               | `/api/timetable/solver/ortools`            | POST /api/timetable/solver/ortools Tries OR-Tools service (ORTOOLS_SOLVER_URL) then falls back to greedy solver.                    |
| GET, POST          | `/api/timetable/teacher-colors`            | —                                                                                                                                   |
| PUT                | `/api/timetable/teacher-colors/:teacherId` | —                                                                                                                                   |
| GET                | `/api/timetable/teacherPeriodAssignments`  | —                                                                                                                                   |
| GET                | `/api/timetable/timeSlots`                 | —                                                                                                                                   |
| PATCH              | `/api/timetable/timeSlots/:id`             | —                                                                                                                                   |
| POST               | `/api/timetable/version/publish`           | Legacy TimetableVersion publish (separate from TimetableAllocationEntry publish).                                                   |
| GET                | `/api/timetable/view`                      | —                                                                                                                                   |

## /api/transport

| Method       | Route                        | Summary |
| ------------ | ---------------------------- | ------- |
| POST, DELETE | `/api/transport/assignments` | —       |
| GET, POST    | `/api/transport/routes`      | —       |

## /api/users

| Method           | Route                     | Summary |
| ---------------- | ------------------------- | ------- |
| GET              | `/api/users`              | —       |
| GET, PUT, DELETE | `/api/users/:id`          | —       |
| POST             | `/api/users/:id/password` | —       |

## /api/ussd

| Method    | Route       | Summary                                                                                                                                                                     |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST | `/api/ussd` | POST /api/ussd — Africa's Talking USSD callback. Configure AT dashboard: callback URL → https://your-domain/api/ussd Body fields: sessionId, phoneNumber, text, serviceCode |

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
