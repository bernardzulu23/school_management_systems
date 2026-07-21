# ZSMS API Routes Reference

> Auto-generated — do not edit by hand. Regenerate with:
>
> ```bash
> npm run docs:api-routes
> ```

Generated: 2026-07-21T14:40:26.392Z

Total route files: **458**

## Quick index

| Prefix                      | Count |
| --------------------------- | ----: |
| `/api/account`              |     2 |
| `/api/activities`           |     4 |
| `/api/admin`                |    22 |
| `/api/ai`                   |    12 |
| `/api/aiml`                 |     5 |
| `/api/allocations`          |     7 |
| `/api/analytics`            |     1 |
| `/api/announcements`        |     2 |
| `/api/assessments`          |    13 |
| `/api/assignments`          |     4 |
| `/api/attendance`           |     9 |
| `/api/auth`                 |     9 |
| `/api/billing`              |     2 |
| `/api/career-clusters`      |     2 |
| `/api/careers`              |     2 |
| `/api/cbc`                  |     2 |
| `/api/changelog`            |     1 |
| `/api/chat`                 |    13 |
| `/api/classes`              |     5 |
| `/api/code-playground`      |     1 |
| `/api/creative-features`    |     1 |
| `/api/cron`                 |     4 |
| `/api/csp-report`           |     1 |
| `/api/csrf-token`           |     1 |
| `/api/curriculum`           |     7 |
| `/api/dashboard`            |    24 |
| `/api/departments`          |     1 |
| `/api/ecz`                  |    14 |
| `/api/features`             |     1 |
| `/api/feedback`             |     1 |
| `/api/fees`                 |     6 |
| `/api/field-trips`          |     1 |
| `/api/games`                |     2 |
| `/api/government`           |     7 |
| `/api/grades`               |     1 |
| `/api/guidance`             |    17 |
| `/api/health`               |     1 |
| `/api/hod`                  |    12 |
| `/api/hods`                 |     3 |
| `/api/hostel`               |     2 |
| `/api/houses`               |     2 |
| `/api/innovation`           |     2 |
| `/api/lesson-plans`         |     8 |
| `/api/marketplace`          |     7 |
| `/api/materials`            |     5 |
| `/api/mobile`               |    12 |
| `/api/multimedia-lessons`   |     2 |
| `/api/notifications`        |     8 |
| `/api/onboarding`           |    10 |
| `/api/parent`               |     4 |
| `/api/payments`             |     2 |
| `/api/ping`                 |     1 |
| `/api/platform`             |    19 |
| `/api/privacy`              |     3 |
| `/api/profile`              |     4 |
| `/api/proprietor`           |     1 |
| `/api/public`               |     6 |
| `/api/question-bank`        |     2 |
| `/api/recipes`              |     5 |
| `/api/school`               |     1 |
| `/api/schools`              |     3 |
| `/api/security-static`      |     2 |
| `/api/sentry-example-api`   |     1 |
| `/api/sic`                  |     6 |
| `/api/sms`                  |    15 |
| `/api/solo`                 |     6 |
| `/api/strategic-goals`      |     2 |
| `/api/strategic-reviews`    |     1 |
| `/api/student`              |    13 |
| `/api/student-works`        |     2 |
| `/api/students`             |     6 |
| `/api/subjects`             |     3 |
| `/api/teacher`              |     8 |
| `/api/teacher-performance`  |     4 |
| `/api/teachers`             |     5 |
| `/api/teaching`             |     4 |
| `/api/teaching-assignments` |     1 |
| `/api/timetable`            |    33 |
| `/api/transport`            |     2 |
| `/api/upload`               |     1 |
| `/api/users`                |     3 |
| `/api/ussd`                 |     1 |
| `/api/v1`                   |     7 |

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

| Method            | Route                                           | Summary                                                                                              |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| GET               | `/api/admin/allocations`                        | —                                                                                                    |
| DELETE            | `/api/admin/allocations/:allocationId`          | —                                                                                                    |
| POST              | `/api/admin/allocations/:allocationId/approve`  | —                                                                                                    |
| POST              | `/api/admin/allocations/:allocationId/reject`   | —                                                                                                    |
| GET               | `/api/admin/allocations/:allocationId/review`   | —                                                                                                    |
| PUT               | `/api/admin/allocations/:allocationId/update`   | —                                                                                                    |
| DELETE            | `/api/admin/allocations/clear`                  | —                                                                                                    |
| GET               | `/api/admin/allocations/pending`                | —                                                                                                    |
| GET               | `/api/admin/diagnostics/students`               | —                                                                                                    |
| GET               | `/api/admin/export/users`                       | —                                                                                                    |
| GET               | `/api/admin/master-timetable`                   | —                                                                                                    |
| GET               | `/api/admin/notifications`                      | —                                                                                                    |
| POST              | `/api/admin/notifications/:notificationId/read` | —                                                                                                    |
| GET, POST, DELETE | `/api/admin/parent-links`                       | Admin: list parent links for a student or school. Query: ?studentId= (optional)                      |
| POST              | `/api/admin/repair/backfill-class-ids`          | —                                                                                                    |
| POST              | `/api/admin/repair/backfill-result-entered-by`  | —                                                                                                    |
| POST              | `/api/admin/repair/clear-default-classes`       | —                                                                                                    |
| POST              | `/api/admin/repair/enrollments`                 | —                                                                                                    |
| POST              | `/api/admin/repair/normalize-classes`           | —                                                                                                    |
| GET, POST         | `/api/admin/schools`                            | —                                                                                                    |
| GET               | `/api/admin/sms-gateway-status`                 | GET /api/admin/sms-gateway-status Platform admin: fleet health — offline if lastSeenAt > 10 minutes. |
| GET               | `/api/admin/teacher-performance`                | —                                                                                                    |

## /api/ai

| Method    | Route                             | Summary                                                                                                                                                        |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST      | `/api/ai/competency-analyzer`     | —                                                                                                                                                              |
| POST      | `/api/ai/ecz-exam-questions`      | —                                                                                                                                                              |
| POST      | `/api/ai/ecz-practice`            | —                                                                                                                                                              |
| POST      | `/api/ai/lesson-planner`          | Treat empty / zero / NaN as omitted so the UI does not fail Zod on blank MoGE headcounts.                                                                      |
| POST      | `/api/ai/phonics-trainer`         | —                                                                                                                                                              |
| POST      | `/api/ai/quiz-maker`              | formative → MCQ; summative/exam/secondary → ECSEOL secondary_scenario when school/grade allow                                                                  |
| POST      | `/api/ai/report-comments`         | —                                                                                                                                                              |
| POST      | `/api/ai/story-weaver`            | —                                                                                                                                                              |
| POST      | `/api/ai/study-assistant`         | POST /api/ai/study-assistant — RAG-grounded Q&A scoped to school materials + curriculum. Students must pick an enrolled subject; teachers may use any subject. |
| GET, POST | `/api/ai/term-reports`            | —                                                                                                                                                              |
| PATCH     | `/api/ai/term-reports/:id`        | PATCH /api/ai/term-reports/[id] — HOD approve / publish.                                                                                                       |
| GET       | `/api/ai/term-reports/:id/export` | —                                                                                                                                                              |

## /api/aiml

| Method    | Route                       | Summary |
| --------- | --------------------------- | ------- |
| GET, POST | `/api/aiml/ecz-practice`    | —       |
| GET, POST | `/api/aiml/lesson-planner`  | —       |
| GET, POST | `/api/aiml/quiz-maker`      | —       |
| GET, POST | `/api/aiml/report-comments` | —       |
| GET, POST | `/api/aiml/story-weaver`    | —       |

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

## /api/announcements

| Method           | Route                    | Summary                                                                           |
| ---------------- | ------------------------ | --------------------------------------------------------------------------------- |
| GET, POST        | `/api/announcements`     | Legacy announcements API — returns school notices until a dedicated model exists. |
| GET, PUT, DELETE | `/api/announcements/:id` | —                                                                                 |

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

| Method           | Route                            | Summary                                                                                                                                                                                 |
| ---------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST        | `/api/attendance`                | —                                                                                                                                                                                       |
| GET, PUT, DELETE | `/api/attendance/:id`            | —                                                                                                                                                                                       |
| POST             | `/api/attendance/qr-generate`    | POST /api/attendance/qr-generate Teacher starts a QR attendance session. Returns QR image and session details. BODY: { classId, subjectId, periodLabel?, term?, academicYear?, shift? } |
| GET              | `/api/attendance/qr-info`        | GET /api/attendance/qr-info?t={token} Public: session context + roster for the /attend mobile page.                                                                                     |
| POST             | `/api/attendance/qr-mark`        | POST /api/attendance/qr-mark Student marks present via QR token (no auth cookie required). BODY: { token, studentName? } or { token, studentId }                                        |
| POST             | `/api/attendance/returns/submit` | —                                                                                                                                                                                       |
| GET              | `/api/attendance/sessions`       | GET /api/attendance/sessions?classId=&date=YYYY-MM-DD&subjectId= Lists mobile lesson sessions for the unified web attendance dashboard.                                                 |
| GET              | `/api/attendance/stats`          | —                                                                                                                                                                                       |
| POST             | `/api/attendance/test-sms`       | DEV ONLY — test parent attendance SMS for a student.                                                                                                                                    |

## /api/auth

| Method        | Route                             | Summary                                                                                                                         |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| POST          | `/api/auth/forgot-password`       | —                                                                                                                               |
| POST          | `/api/auth/login`                 | —                                                                                                                               |
| POST, OPTIONS | `/api/auth/logout`                | Host-only by default; only add COOKIE_DOMAIN when explicitly configured in env.                                                 |
| GET           | `/api/auth/me`                    | —                                                                                                                               |
| POST          | `/api/auth/refresh`               | Benign concurrent refresh: old token revoked within this window should not mass-revoke sessions.                                |
| POST          | `/api/auth/register`              | —                                                                                                                               |
| POST          | `/api/auth/reset-password`        | —                                                                                                                               |
| POST          | `/api/auth/reset-password/:token` | —                                                                                                                               |
| POST          | `/api/auth/touch`                 | Explicit "stay signed in" — stamps server-side last-activity for cookie sessions. Subject to CSRF; not a passive poll endpoint. |

## /api/billing

| Method | Route                                      | Summary |
| ------ | ------------------------------------------ | ------- |
| POST   | `/api/billing/subscription-payment`        | —       |
| GET    | `/api/billing/subscription-payment/status` | —       |

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

## /api/changelog

| Method | Route            | Summary                                                                                                     |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/api/changelog` | GET /api/changelog — read-only system activity trail. No POST/PATCH/DELETE — ChangeLogEntry is append-only. |

## /api/chat

| Method    | Route                                       | Summary                                                                                                                                                                         |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST      | `/api/chat/headteacher-query`               | POST /api/chat/headteacher-query Retrieval-only analytics — NOT generative free-form chat.                                                                                      |
| POST      | `/api/chat/human-message`                   | POST /api/chat/human-message User message during HUMAN_ACTIVE (persisted + relayed via DO). No AI.                                                                              |
| GET       | `/api/chat/lesson-plans/:id/download`       | GET /api/chat/lesson-plans/[id]/download Returns a signed/expiring R2 URL, or streams the local file (dev fallback). Never returns a permanent public URL.                      |
| POST      | `/api/chat/lesson-plans/:id/review`         | POST /api/chat/lesson-plans/[id]/review HOD (assigned) or admin: approve / reject PENDING_APPROVAL submissions.                                                                 |
| POST      | `/api/chat/lesson-plans/:id/submit-to-hod`  | POST /api/chat/lesson-plans/[id]/submit-to-hod Teacher owns submission → PENDING_APPROVAL + hodId via resolveReviewerUserId                                                     |
| POST      | `/api/chat/lesson-plans/generate-from-chat` | POST /api/chat/lesson-plans/generate-from-chat Teacher/HOD: structured JSON → docx → R2/local → DRAFT LessonPlanSubmission                                                      |
| GET       | `/api/chat/lesson-plans/pending`            | GET /api/chat/lesson-plans/pending HOD: pending chat lesson-plan submissions for their department (hodId = self). Admin/headteacher: all pending in school.                     |
| POST      | `/api/chat/navbot`                          | —                                                                                                                                                                               |
| POST      | `/api/chat/request-human`                   | POST /api/chat/request-human Sets session.status = PENDING_HUMAN and sends a metadata-only Telegram alert (tenant name, role, admin console deep link — never message content). |
| POST      | `/api/chat/send-message`                    | POST /api/chat/send-message SSE contract (Teacher/HOD generative path): data: {"sessionId":"...","meta":true}                                                                   |
| GET, POST | `/api/chat/sessions`                        | GET /api/chat/sessions — list current user's sessions for this school                                                                                                           |
| GET       | `/api/chat/sessions/:id`                    | GET /api/chat/sessions/[id] Load own session + recent messages (used by Phase 4 resubmit reopen).                                                                               |
| POST      | `/api/chat/ws-ticket`                       | When true, issue an admin ticket (platform_admin + claimed session only).                                                                                                       |

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

| Method | Route                         | Summary                                                                                                                                                        |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/cron/ecz-reminder`      | GET /api/cron/ecz-reminder — Vercel Cron (15 January). Requires CRON_SECRET.                                                                                   |
| GET    | `/api/cron/fee-overdue-check` | —                                                                                                                                                              |
| GET    | `/api/cron/notifications`     | GET /api/cron/notifications — due scheduled sends, class/test scans, retries, cleanup. Auth: Authorization: Bearer $CRON_SECRET or x-cron-secret: $CRON_SECRET |
| GET    | `/api/cron/sms-low-balance`   | GET /api/cron/sms-low-balance — daily low SMS credit alerts. Requires CRON_SECRET.                                                                             |

## /api/csp-report

| Method | Route             | Summary                                                                         |
| ------ | ----------------- | ------------------------------------------------------------------------------- |
| POST   | `/api/csp-report` | Dev-only CSP violation reporting endpoint (set CSP_REPORT_URI=/api/csp-report). |

## /api/csrf-token

| Method | Route             | Summary                                                                      |
| ------ | ----------------- | ---------------------------------------------------------------------------- |
| GET    | `/api/csrf-token` | GET /api/csrf-token Issues a CSRF token cookie for double-submit validation. |

## /api/curriculum

| Method    | Route                                      | Summary                                                                                                                            |
| --------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| GET       | `/api/curriculum`                          | GET /api/curriculum?subject=&grade=                                                                                                |
| POST      | `/api/curriculum/generate-lesson-plan`     | —                                                                                                                                  |
| POST      | `/api/curriculum/generate-record-template` | —                                                                                                                                  |
| GET, POST | `/api/curriculum/generate-scheme`          | —                                                                                                                                  |
| POST      | `/api/curriculum/ingest`                   | POST /api/curriculum/ingest Body JSON: { pdfUrl, subject?, gradeOrForm? } Or multipart: file (pdf) + optional subject, gradeOrForm |
| GET, POST | `/api/curriculum/scheme`                   | —                                                                                                                                  |
| —         | `/api/curriculum/templates`                | Alias for POST /api/curriculum/generate-record-template                                                                            |

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
| GET        | `/api/dashboard/hod/exam-analysis`              | Resolve department subject + teacher-user scope without requiring pupil enrollments. Schools often have Result rows before PupilSubjectEnrollment is populated.                      |
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

## /api/fees

| Method    | Route                         | Summary |
| --------- | ----------------------------- | ------- |
| GET       | `/api/fees/invoices`          | —       |
| POST      | `/api/fees/invoices/generate` | —       |
| GET, POST | `/api/fees/payments`          | —       |
| GET, POST | `/api/fees/schedules`         | —       |
| GET, POST | `/api/fees/siblings`          | —       |
| GET       | `/api/fees/summary`           | —       |

## /api/field-trips

| Method    | Route              | Summary |
| --------- | ------------------ | ------- |
| GET, POST | `/api/field-trips` | —       |

## /api/games

| Method             | Route            | Summary                                                                                   |
| ------------------ | ---------------- | ----------------------------------------------------------------------------------------- |
| GET, POST          | `/api/games`     | GET /api/games — list school games (teacher/HOD/admin) POST /api/games — create quiz game |
| GET, PATCH, DELETE | `/api/games/:id` | —                                                                                         |

## /api/government

| Method           | Route                                    | Summary |
| ---------------- | ---------------------------------------- | ------- |
| GET, POST, PATCH | `/api/government/deployment`             | —       |
| GET              | `/api/government/emis-export`            | —       |
| GET              | `/api/government/gender-report`          | —       |
| GET, POST        | `/api/government/grants`                 | —       |
| POST, PATCH      | `/api/government/grants/:id/allocations` | —       |
| GET, POST        | `/api/government/leave`                  | —       |
| PATCH            | `/api/government/leave/:id`              | —       |

## /api/grades

| Method    | Route         | Summary                                                                                            |
| --------- | ------------- | -------------------------------------------------------------------------------------------------- |
| GET, POST | `/api/grades` | Offline sync legacy endpoint — returns empty grade list (use /api/assessments or /api/ecz/scores). |

## /api/guidance

| Method             | Route                                 | Summary |
| ------------------ | ------------------------------------- | ------- |
| GET, POST          | `/api/guidance/assignments`           | —       |
| DELETE             | `/api/guidance/assignments/:id`       | —       |
| GET, POST          | `/api/guidance/cases`                 | —       |
| GET, PATCH         | `/api/guidance/cases/:id`             | —       |
| POST               | `/api/guidance/cases/:id/escalate`    | —       |
| POST               | `/api/guidance/cases/:id/log`         | —       |
| POST               | `/api/guidance/cases/:id/referral`    | —       |
| GET, POST          | `/api/guidance/documents`             | —       |
| GET, PATCH, DELETE | `/api/guidance/documents/:id`         | —       |
| GET, POST          | `/api/guidance/documents/blob-upload` | —       |
| GET, PATCH         | `/api/guidance/escalations`           | —       |
| GET                | `/api/guidance/pupils`                | —       |
| GET, POST          | `/api/guidance/reentry`               | —       |
| PATCH              | `/api/guidance/reentry/:id`           | —       |
| GET                | `/api/guidance/reports/termly`        | —       |
| GET, POST          | `/api/guidance/resources`             | —       |
| PATCH, DELETE      | `/api/guidance/resources/:id`         | —       |

## /api/health

| Method | Route         | Summary                                                                                    |
| ------ | ------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/health` | GET /api/health — production health check (no auth). ?live=1 — liveness only (always 200). |

## /api/hod

| Method        | Route                                    | Summary                                                                                                                                                                                                 |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST     | `/api/hod/budget`                        | —                                                                                                                                                                                                       |
| GET, POST     | `/api/hod/correspondence`                | —                                                                                                                                                                                                       |
| PATCH, DELETE | `/api/hod/correspondence/:id`            | —                                                                                                                                                                                                       |
| GET, POST     | `/api/hod/daily-routine`                 | —                                                                                                                                                                                                       |
| PATCH         | `/api/hod/daily-routine/:id`             | —                                                                                                                                                                                                       |
| GET, POST     | `/api/hod/files`                         | —                                                                                                                                                                                                       |
| DELETE        | `/api/hod/files/:id`                     | —                                                                                                                                                                                                       |
| GET           | `/api/hod/files/download/:id`            | —                                                                                                                                                                                                       |
| GET           | `/api/hod/lesson-plans/teacher-coverage` | GET /api/hod/lesson-plans/teacher-coverage Query: teacherId (required for drilldown) / omit for department teacher list. Counts scoped to schoolId AND HOD department. Cross-department teachers → 403. |
| GET, POST     | `/api/hod/meetings`                      | —                                                                                                                                                                                                       |
| PATCH         | `/api/hod/meetings/:id`                  | —                                                                                                                                                                                                       |
| GET, POST     | `/api/hod/stock`                         | —                                                                                                                                                                                                       |

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

## /api/houses

| Method       | Route                     | Summary |
| ------------ | ------------------------- | ------- |
| GET, POST    | `/api/houses`             | —       |
| POST, DELETE | `/api/houses/assignments` | —       |

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

| Method    | Route                                             | Summary                                                                                                                                                                                                           |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST | `/api/mobile/attendance/sessions`                 | —                                                                                                                                                                                                                 |
| POST      | `/api/mobile/attendance/sessions/:id/close`       | —                                                                                                                                                                                                                 |
| POST      | `/api/mobile/attendance/sessions/:id/marks`       | —                                                                                                                                                                                                                 |
| POST      | `/api/mobile/attendance/sessions/:id/twin-verify` | Twin secondary auth — PIN only (server-side bcrypt). Prompt 23: a previous `biometricVerified: true` body flag was accepted with no server corroboration (any client could set it). Device LocalAuthentication is |
| POST      | `/api/mobile/attendance/verify-face`              | Server-side face match. Only pupils with school feature ON + active consent contribute templates. No consent / no match → client must use manual marking.                                                         |
| POST      | `/api/mobile/auth/login`                          | —                                                                                                                                                                                                                 |
| POST      | `/api/mobile/auth/refresh`                        | —                                                                                                                                                                                                                 |
| GET       | `/api/mobile/class-roster`                        | —                                                                                                                                                                                                                 |
| POST      | `/api/mobile/push/register`                       | —                                                                                                                                                                                                                 |
| GET       | `/api/mobile/school/lookup`                       | Public: validate school subdomain before mobile login                                                                                                                                                             |
| GET       | `/api/mobile/session-context`                     | —                                                                                                                                                                                                                 |
| POST      | `/api/mobile/sync`                                | —                                                                                                                                                                                                                 |

## /api/multimedia-lessons

| Method    | Route                         | Summary |
| --------- | ----------------------------- | ------- |
| GET, POST | `/api/multimedia-lessons`     | —       |
| PUT       | `/api/multimedia-lessons/:id` | —       |

## /api/notifications

| Method        | Route                                          | Summary                                                                                                                 |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PATCH, DELETE | `/api/notifications/:id/mark-read`             | —                                                                                                                       |
| GET           | `/api/notifications/list`                      | —                                                                                                                       |
| GET, PATCH    | `/api/notifications/preferences`               | —                                                                                                                       |
| POST          | `/api/notifications/schedule`                  | —                                                                                                                       |
| POST          | `/api/notifications/send-batch`                | —                                                                                                                       |
| POST          | `/api/notifications/send-immediate`            | —                                                                                                                       |
| GET, POST     | `/api/notifications/web-push/subscribe`        | Prefer GET /api/notifications/web-push/vapid-public-key (public, no auth).                                              |
| GET           | `/api/notifications/web-push/vapid-public-key` | GET /api/notifications/web-push/vapid-public-key Public — no auth. Used by browsers / service workers before subscribe. |

## /api/onboarding

| Method    | Route                                 | Summary                                                                   |
| --------- | ------------------------------------- | ------------------------------------------------------------------------- |
| POST      | `/api/onboarding/complete`            | —                                                                         |
| PATCH     | `/api/onboarding/contact`             | Save admin phone during onboarding (after email verify / session cookie). |
| GET, POST | `/api/onboarding/lipila/callback`     | Matches UUID / CUID id shape used across ZSMS (see lib/schemas idString). |
| POST      | `/api/onboarding/pay`                 | —                                                                         |
| POST      | `/api/onboarding/resend-verification` | —                                                                         |
| POST      | `/api/onboarding/select-plan`         | —                                                                         |
| POST      | `/api/onboarding/start`               | —                                                                         |
| GET       | `/api/onboarding/status`              | —                                                                         |
| POST      | `/api/onboarding/student`             | —                                                                         |
| GET       | `/api/onboarding/verify/:token`       | —                                                                         |

## /api/parent

| Method    | Route                       | Summary                                                                 |
| --------- | --------------------------- | ----------------------------------------------------------------------- |
| GET, POST | `/api/parent/accept-invite` | Preview a pending parent invite (public — token is the secret).         |
| GET       | `/api/parent/child`         | Parent-authenticated portal data for a linked child. Query: ?studentId= |
| GET       | `/api/parent/children`      | List children linked to the authenticated parent.                       |
| GET       | `/api/parent/portal`        | —                                                                       |

## /api/payments

| Method    | Route                           | Summary |
| --------- | ------------------------------- | ------- |
| GET, POST | `/api/payments/lipila/callback` | —       |
| GET, POST | `/api/payments/mobile-money`    | —       |

## /api/ping

| Method | Route       | Summary                                                                              |
| ------ | ----------- | ------------------------------------------------------------------------------------ |
| GET    | `/api/ping` | Minimal liveness check - no imports, no DB. Use for Vercel / container healthchecks. |

## /api/platform

| Method        | Route                                        | Summary                                                                                                                                                                                                    |
| ------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST          | `/api/platform/auth/login`                   | —                                                                                                                                                                                                          |
| GET           | `/api/platform/auth/me`                      | —                                                                                                                                                                                                          |
| GET, PATCH    | `/api/platform/auth/profile`                 | —                                                                                                                                                                                                          |
| GET           | `/api/platform/billing/payments`             | —                                                                                                                                                                                                          |
| GET           | `/api/platform/billing/summary`              | —                                                                                                                                                                                                          |
| GET           | `/api/platform/health`                       | —                                                                                                                                                                                                          |
| GET           | `/api/platform/health/rag`                   | —                                                                                                                                                                                                          |
| GET           | `/api/platform/schools`                      | List affiliated, paid schools — metadata only (no enrollment counts).                                                                                                                                      |
| PATCH, DELETE | `/api/platform/schools/:id`                  | Patch tenant billing flags and location metadata only.                                                                                                                                                     |
| GET           | `/api/platform/stats/districts`              | GET /api/platform/stats/districts?province=Lusaka                                                                                                                                                          |
| GET           | `/api/platform/stats/overview`               | —                                                                                                                                                                                                          |
| GET           | `/api/platform/stats/provinces`              | —                                                                                                                                                                                                          |
| GET           | `/api/platform/stats/school-usage`           | Per-school student + teacher counts only (no names, grades, or records).                                                                                                                                   |
| GET           | `/api/platform/stats/streams`                | GET /api/platform/stats/streams — schools grouped by province+district reporting stream                                                                                                                    |
| GET           | `/api/platform/support/queue`                | GET /api/platform/support/queue List ChatSession where status = PENDING_HUMAN, order by updatedAt. PILOT STAGE: escalations route to platform admin. Once past single-school                               |
| GET           | `/api/platform/support/sessions/:id`         | GET /api/platform/support/sessions/[id] Full transcript for platform admin (content is read here — never in Telegram).                                                                                     |
| POST          | `/api/platform/support/sessions/:id/claim`   | POST /api/platform/support/sessions/[id]/claim Sets assignedToId + HUMAN_ACTIVE only after server-side platform_admin verification. Then notifies the Durable Object so it accepts this admin's WebSocket. |
| POST          | `/api/platform/support/sessions/:id/close`   | POST /api/platform/support/sessions/[id]/close HUMAN_ACTIVE (or PENDING_HUMAN) → CLOSED. Platform admin only (pilot).                                                                                      |
| POST          | `/api/platform/support/sessions/:id/message` | POST /api/platform/support/sessions/[id]/message Claiming platform admin sends a HUMAN_STAFF message; DO relays to user.                                                                                   |

## /api/privacy

| Method     | Route                                           | Summary                                                            |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| GET, PATCH | `/api/privacy/facial-attendance-settings`       | —                                                                  |
| GET, POST  | `/api/privacy/facial-consent`                   | Record consent grant or denial (paper form digitised).             |
| POST       | `/api/privacy/facial-consent/:pupilId/withdraw` | Withdraw active facial consent for a pupil (clears face template). |

## /api/profile

| Method | Route                                 | Summary |
| ------ | ------------------------------------- | ------- |
| PUT    | `/api/profile/details`                | —       |
| PUT    | `/api/profile/password`               | —       |
| PUT    | `/api/profile/picture`                | —       |
| GET    | `/api/profile/picture/file/:filename` | —       |

## /api/proprietor

| Method | Route                      | Summary |
| ------ | -------------------------- | ------- |
| GET    | `/api/proprietor/overview` | —       |

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

## /api/security-static

| Method | Route                                    | Summary                                                                                |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/api/security-static/assets/:[...path]` | Rewritten from /Assets/:path* (beforeFiles) — bypasses Vercel public/ ACAO:* defaults. |
| GET    | `/api/security-static/icons/:[...path]`  | Rewritten from /icons/:path* (beforeFiles) — bypasses Vercel public/ ACAO:* defaults.  |

## /api/sentry-example-api

| Method | Route                     | Summary |
| ------ | ------------------------- | ------- |
| —      | `/api/sentry-example-api` | —       |

## /api/sic

| Method           | Route                      | Summary |
| ---------------- | -------------------------- | ------- |
| GET, POST        | `/api/sic/activity-plans`  | —       |
| GET              | `/api/sic/analytics`       | —       |
| GET, POST        | `/api/sic/assignments`     | —       |
| DELETE           | `/api/sic/assignments/:id` | —       |
| GET, POST, PATCH | `/api/sic/cpd-plans`       | —       |
| GET, POST, PATCH | `/api/sic/him`             | —       |

## /api/sms

| Method        | Route                           | Summary                                                                                                                                                                                                                                              |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET, PATCH    | `/api/sms/balance`              | —                                                                                                                                                                                                                                                    |
| POST          | `/api/sms/broadcast`            | —                                                                                                                                                                                                                                                    |
| POST          | `/api/sms/broadcast-dispatcher` | —                                                                                                                                                                                                                                                    |
| POST          | `/api/sms/delivery`             | —                                                                                                                                                                                                                                                    |
| PATCH, DELETE | `/api/sms/gateway/:id`          | PATCH /api/sms/gateway/[id] — update deviceName / isActive / school enable flag DELETE /api/sms/gateway/[id] — revoke (hard-delete) a registered gateway device Platform-admin only. Tenant scoped: optional body/query schoolId must match the row. |
| GET           | `/api/sms/gateway/queue`        | GET /api/sms/gateway/queue Android poll: return PENDING CUSTOM_GATEWAY messages, mark DISPATCHED (idempotency).                                                                                                                                      |
| POST          | `/api/sms/gateway/register`     | POST /api/sms/gateway/register Platform-admin only: create a gateway device and return the raw pairing token once.                                                                                                                                   |
| POST          | `/api/sms/gateway/status`       | POST /api/sms/gateway/status Android reports per-message SENT / FAILED after SmsManager callback.                                                                                                                                                    |
| POST          | `/api/sms/inbound`              | —                                                                                                                                                                                                                                                    |
| GET           | `/api/sms/logs`                 | —                                                                                                                                                                                                                                                    |
| POST          | `/api/sms/queue-worker`         | —                                                                                                                                                                                                                                                    |
| GET           | `/api/sms/recipients`           | —                                                                                                                                                                                                                                                    |
| POST          | `/api/sms/send`                 | —                                                                                                                                                                                                                                                    |
| POST          | `/api/sms/test/onboarding`      | DEV ONLY — test onboarding welcome SMS.                                                                                                                                                                                                              |
| POST          | `/api/sms/test/results-parent`  | DEV ONLY — test parent results-complete SMS (does not update ResultsStatus).                                                                                                                                                                         |

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

| Method                 | Route                                  | Summary                                                                                                                              |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET                    | `/api/student/assessments`             | —                                                                                                                                    |
| GET                    | `/api/student/curriculum-topics`       | GET /api/student/curriculum-topics?subject= Topics from ingested curriculum JSON for an enrolled subject + the student's grade/form. |
| GET, POST              | `/api/student/flashcards`              | —                                                                                                                                    |
| POST                   | `/api/student/flashcards/:id/complete` | —                                                                                                                                    |
| GET, POST, PUT, DELETE | `/api/student/goals`                   | —                                                                                                                                    |
| GET, POST              | `/api/student/materials`               | —                                                                                                                                    |
| GET                    | `/api/student/mock-exam`               | —                                                                                                                                    |
| GET                    | `/api/student/mock-exam/:id`           | —                                                                                                                                    |
| POST                   | `/api/student/mock-exam/:id/submit`    | —                                                                                                                                    |
| POST                   | `/api/student/mock-exam/start`         | —                                                                                                                                    |
| GET                    | `/api/student/notices`                 | —                                                                                                                                    |
| GET                    | `/api/student/results`                 | —                                                                                                                                    |
| GET                    | `/api/student/subjects`                | —                                                                                                                                    |

## /api/student-works

| Method    | Route                         | Summary                                                                                                                                          |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET, POST | `/api/student-works`          | —                                                                                                                                                |
| POST      | `/api/student-works/:id/like` | POST /api/student-works/[id]/like — increment likes on a school-scoped StudentWork. Minimal v1: counter only (no per-user uniqueness table yet). |

## /api/students

| Method           | Route                                | Summary                                                                                                                                 |
| ---------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| GET, POST        | `/api/students`                      | —                                                                                                                                       |
| GET, PUT, DELETE | `/api/students/:id`                  | —                                                                                                                                       |
| POST, DELETE     | `/api/students/:id/face-enrollment`  | POST — store derived face embedding only (never raw images). Requires: school facialAttendanceEnabled + active ConsentRecord for pupil. |
| POST             | `/api/students/:id/twin-pin`         | —                                                                                                                                       |
| POST             | `/api/students/bulk-upload`          | —                                                                                                                                       |
| GET              | `/api/students/bulk-upload/template` | —                                                                                                                                       |

## /api/subjects

| Method           | Route                       | Summary |
| ---------------- | --------------------------- | ------- |
| GET, POST        | `/api/subjects`             | —       |
| GET, PUT, DELETE | `/api/subjects/:id`         | —       |
| GET              | `/api/subjects/by-category` | —       |

## /api/teacher

| Method            | Route                                             | Summary                                                                                                                                                           |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET               | `/api/teacher/department-activities`              | —                                                                                                                                                                 |
| GET               | `/api/teacher/lesson-plans/stats`                 | GET /api/teacher/lesson-plans/stats Single Prisma groupBy on LessonPlanSubmission by SubmissionStatus for the authenticated teacher, scoped to schoolId (tenant). |
| GET               | `/api/teacher/lesson-plans/submissions`           | GET /api/teacher/lesson-plans/submissions List the teacher's chat LessonPlanSubmission rows (for stats drilldown / resubmit).                                     |
| GET, POST         | `/api/teacher/materials`                          | List / create study materials (JSON or multipart with `file`)                                                                                                     |
| GET               | `/api/teacher/materials/file/:schoolId/:filename` | Serve locally stored study files (auth + tenant scoped)                                                                                                           |
| PUT, DELETE       | `/api/teacher/materials/:id`                      | Update / delete study material                                                                                                                                    |
| GET               | `/api/teacher/pupils`                             | —                                                                                                                                                                 |
| GET, POST, DELETE | `/api/teacher/results`                            | —                                                                                                                                                                 |
| GET               | `/api/teacher/results/export`                     | —                                                                                                                                                                 |

## /api/teacher-performance

| Method | Route                                                     | Summary |
| ------ | --------------------------------------------------------- | ------- |
| GET    | `/api/teacher-performance/observation-tools`              | —       |
| POST   | `/api/teacher-performance/observations`                   | —       |
| GET    | `/api/teacher-performance/teachers/:id/detailed-analysis` | —       |
| GET    | `/api/teacher-performance/teachers/:id/summary`           | —       |

## /api/teachers

| Method           | Route                                | Summary |
| ---------------- | ------------------------------------ | ------- |
| GET, PUT, DELETE | `/api/teachers`                      | —       |
| GET, PUT, DELETE | `/api/teachers/:id`                  | —       |
| GET, PUT         | `/api/teachers/:id/departments`      | —       |
| POST             | `/api/teachers/bulk-upload`          | —       |
| GET              | `/api/teachers/bulk-upload/template` | —       |

## /api/teaching

| Method    | Route                              | Summary |
| --------- | ---------------------------------- | ------- |
| GET       | `/api/teaching/coverage-analytics` | —       |
| POST      | `/api/teaching/mark-week-complete` | —       |
| GET, POST | `/api/teaching/test-schedule`      | —       |
| GET, POST | `/api/teaching/topic-mastery`      | —       |

## /api/teaching-assignments

| Method    | Route                       | Summary |
| --------- | --------------------------- | ------- |
| GET, POST | `/api/teaching-assignments` | —       |

## /api/timetable

| Method             | Route                                             | Summary                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                  | `/api/timetable`                                  | Legacy alias — clients should call GET /api/timetable/view directly.                                                                                                                                                                                                                   |
| GET, PUT, DELETE   | `/api/timetable/:id`                              | —                                                                                                                                                                                                                                                                                      |
| GET                | `/api/timetable/active-season`                    | GET /api/timetable/active-season Returns the term/year with the most draft+published periods for this school so overview widgets don't default to an empty/sparse Term 1 while work lives on Term 2.                                                                                   |
| GET, POST          | `/api/timetable/allocations`                      | —                                                                                                                                                                                                                                                                                      |
| DELETE             | `/api/timetable/allocations/:id`                  | —                                                                                                                                                                                                                                                                                      |
| POST               | `/api/timetable/allocations/push`                 | —                                                                                                                                                                                                                                                                                      |
| POST               | `/api/timetable/assignTeacherToPeriod`            | —                                                                                                                                                                                                                                                                                      |
| GET                | `/api/timetable/classes`                          | —                                                                                                                                                                                                                                                                                      |
| GET, POST          | `/api/timetable/config`                           | GET/POST school timetable hours + schedulingRules (session rules A/B; optional teacher workload caps: maxPeriodsPerDay / maxConsecutivePeriods / break coverage — each opt-in via \*Enabled flags, default off).                                                                       |
| GET                | `/api/timetable/conflicts`                        | GET /api/timetable/conflicts?term=Term+1&academicYear=2026 Server-side draft audit (conflictAudit / validateTimetable). Issue types include ROOM_DOUBLE_BOOKED, TEACHER_CLASS_SUBJECT_SPLIT, TEACHER_CLASS_RETURN_TOO_SOON, plus classic double-book / missing-period / workload hits. |
| POST               | `/api/timetable/conflicts/resolve`                | POST /api/timetable/conflicts/resolve Apply a resolution action to draft timetable allocation entries.                                                                                                                                                                                 |
| POST               | `/api/timetable/conflicts/seed-test`              | POST /api/timetable/conflicts/seed-test Dev/helper: runs the real draft conflict audit for the caller's school (same source of truth as GET /api/timetable/conflicts) and persists draft meta.                                                                                         |
| GET                | `/api/timetable/curriculum-compliance`            | GET /api/timetable/curriculum-compliance?term=&academicYear=&format=json or docx Periods scheduled vs curriculum-required (same math as MISSING_PERIODS).                                                                                                                              |
| GET, PATCH         | `/api/timetable/draft-meta`                       | GET /api/timetable/draft-meta?term=Term+1&academicYear=2026&refresh=false Lightweight read of TimetableDraftMeta (no full rescan unless refresh=true).                                                                                                                                 |
| GET, PATCH, DELETE | `/api/timetable/entries`                          | Single entry: `{ id }`. Bulk clear: `{ clearAll: true, term, academicYear }` (draft only).                                                                                                                                                                                             |
| POST               | `/api/timetable/entries/clone-published-to-draft` | POST /api/timetable/entries/clone-published-to-draft Create an editable draft by copying the published timetable for a term.                                                                                                                                                           |
| POST               | `/api/timetable/entries/copy-from-term`           | POST /api/timetable/entries/copy-from-term Copy a previous term's timetable structure into a new draft for the target term. Remaps times onto the current school bell schedule and allocation IDs for the target season.                                                               |
| POST               | `/api/timetable/entries/sync-draft`               | POST /api/timetable/entries/sync-draft Persist in-memory solver/UI assignments to TimetableAllocationEntry (draft).                                                                                                                                                                    |
| GET                | `/api/timetable/export-schedule`                  | GET /api/timetable/export-schedule?scope=teacher or class&id=&term=&academicYear=&format=docx or html                                                                                                                                                                                  |
| GET                | `/api/timetable/feasibility`                      | GET /api/timetable/feasibility?term=Term+1&academicYear=2026 Pre-generation capacity check — teacher/class load vs bell schedule.                                                                                                                                                      |
| GET, POST          | `/api/timetable/generate`                         | Solver + save can exceed the default serverless limit on large schools.                                                                                                                                                                                                                |
| GET, POST          | `/api/timetable/notifications`                    | —                                                                                                                                                                                                                                                                                      |
| GET                | `/api/timetable/periods`                          | —                                                                                                                                                                                                                                                                                      |
| POST               | `/api/timetable/publish`                          | POST replace-in-transaction publish: validates hard conflicts, then promoteDraftTimetableToPublished (single $transaction: delete prior published → promote draft). Blocks sparse drafts unless force: true.                                                                           |
| POST               | `/api/timetable/solver/generate`                  | POST /api/timetable/solver/generate Greedy timetable solver — runs on Vercel + Neon with no external services.                                                                                                                                                                         |
| POST               | `/api/timetable/solver/ortools`                   | POST /api/timetable/solver/ortools Tries OR-Tools service (ORTOOLS_SOLVER_URL) then falls back to greedy solver. Persists placements to draft TimetableAllocationEntry by default (persist: false to preview only).                                                                    |
| GET, POST          | `/api/timetable/teacher-colors`                   | GET loads map + ensures unique colours (assignUniqueColorsForSchool). POST { autoAssign: true } mass-assign, or { teacherId } ensure one teacher. Uniqueness is enforced server-side (response unique/distinct).                                                                       |
| PUT                | `/api/timetable/teacher-colors/:teacherId`        | Manual colour override. Returns 409 COLOR_TOO_CLOSE when uniqueness check fails against another teacher.                                                                                                                                                                               |
| GET                | `/api/timetable/teacherPeriodAssignments`         | —                                                                                                                                                                                                                                                                                      |
| GET                | `/api/timetable/timeSlots`                        | List bell-schedule TimeSlot rows for the school.                                                                                                                                                                                                                                       |
| PATCH              | `/api/timetable/timeSlots/:id`                    | Bell schedule period editing (start/end, break, double-period continuation).                                                                                                                                                                                                           |
| POST               | `/api/timetable/version/publish`                  | Legacy TimetableVersion publish (separate from TimetableAllocationEntry publish).                                                                                                                                                                                                      |
| GET                | `/api/timetable/view`                             | GET published timetable grid for the school (optional class/teacher filters). Source of truth for teacher/student/HOD read-only views — not a local conflict engine.                                                                                                                   |

## /api/transport

| Method       | Route                        | Summary |
| ------------ | ---------------------------- | ------- |
| POST, DELETE | `/api/transport/assignments` | —       |
| GET, POST    | `/api/transport/routes`      | —       |

## /api/upload

| Method | Route         | Summary                                                                                        |
| ------ | ------------- | ---------------------------------------------------------------------------------------------- |
| POST   | `/api/upload` | Multipart study/RAG material file upload. Returns `fileUrl` (Vercel Blob or local `.uploads`). |

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

| Method | Route                                                        | Summary                                                                              |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| POST   | `/api/v1/notifications/subscribe`                            | PWA push subscription — same behaviour as POST /api/notifications/web-push/subscribe |
| —      | `/api/v1/subjects/by-category`                               | —                                                                                    |
| —      | `/api/v1/teacher-performance/observation-tools`              | —                                                                                    |
| —      | `/api/v1/teacher-performance/observations`                   | —                                                                                    |
| —      | `/api/v1/teacher-performance/teachers/:id/detailed-analysis` | —                                                                                    |
| —      | `/api/v1/teacher-performance/teachers/:id/summary`           | —                                                                                    |
| —      | `/api/v1/users`                                              | —                                                                                    |

---

## Conventions

- Most routes require auth cookie + school tenant context.
- Public: `/api/health`, `/api/auth/login`, `/api/attendance/qr-*`, `/api/public/*`.
- Platform admin: `/api/platform/*`.
- Mobile: `/api/mobile/*`.
