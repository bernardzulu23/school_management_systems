# Zambian School Management System (ZSMS) — Full Project Review

**Document:** `full-review.md`  
**Version:** 1.0  
**Date:** May 2026  
**App version:** 2.0.3  
**Scope:** Every web page, role dashboard, assessments, APIs, mobile app, and data layer — nothing omitted.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Roles and access model](#2-roles-and-access-model)
3. [Public and authentication pages](#3-public-and-authentication-pages)
4. [Student portal — all pages](#4-student-portal--all-pages)
5. [Teacher portal — all pages](#5-teacher-portal--all-pages)
6. [Head of Department (HOD) — all pages](#6-head-of-department-hod--all-pages)
7. [Headteacher / school admin — all pages](#7-headteacher--school-admin--all-pages)
8. [Shared / multi-role dashboard pages](#8-shared--multi-role-dashboard-pages)
9. [School admin routes (`/admin`)](#9-school-admin-routes-admin)
10. [Platform operator (`/platform`)](#10-platform-operator-platform)
11. [Marketplace](#11-marketplace)
12. [Innovation Hub and creative features](#12-innovation-hub-and-creative-features)
13. [Assessments — complete reference](#13-assessments--complete-reference)
14. [Timetable — complete reference](#14-timetable--complete-reference)
15. [Attendance](#15-attendance)
16. [Lesson plans and term reports](#16-lesson-plans-and-term-reports)
17. [Results and ECZ / SBA](#17-results-and-ecz--sba)
18. [AI features](#18-ai-features)
19. [Billing, payments, and onboarding](#19-billing-payments-and-onboarding)
20. [API surface (by domain)](#20-api-surface-by-domain)
21. [Database (Prisma models)](#21-database-prisma-models)
22. [Mobile app (`zsms-mobile`)](#22-mobile-app-zsms-mobile)
23. [Sidebar navigation vs routes](#23-sidebar-navigation-vs-routes)
24. [Known gaps and production notes](#24-known-gaps-and-production-notes)
25. [Appendix — page count summary](#25-appendix--page-count-summary)

---

## 1. Executive summary

**ZSMS** is a multi-tenant school management platform for Zambian primary and secondary schools. Each school runs on its own subdomain (e.g. `https://ndakedaysecondaryschool.bluepeacktechnologies.com`). The stack is **Next.js 16 (App Router)**, **React 19**, **PostgreSQL + Prisma**, **JWT auth**, optional **Groq AI**, **Lipila** mobile money, **Resend** email, **Africa’s Talking** SMS, and an **Expo** teacher mobile app.

| Layer                                     | Count (approx.) |
| ----------------------------------------- | --------------- |
| Web UI pages (`app/**/page.*`)            | **127**         |
| API route handlers (`app/api/**/route.*`) | **265+**        |
| Prisma models                             | **72**          |
| Mobile screens (Expo)                     | **20**          |

This document lists **every** UI route and explains what each area does for students, teachers, HODs, headteachers, and platform operators.

---

## 2. Roles and access model

| Role                        | Dashboard home           | Primary responsibilities                                                                       |
| --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| **student**                 | `/dashboard/student`     | Learn: assessments, materials, timetable, flashcards, ECZ practice, innovation tools           |
| **teacher**                 | `/dashboard/teacher`     | Teach: attendance, assessments, results, lesson plans, materials, AI tools                     |
| **hod**                     | `/dashboard/hod`         | Department: allocations, timetable push, lesson plan approval, exam analysis, department files |
| **headteacher** / **admin** | `/dashboard/headteacher` | School: users, master timetable, MOE reports, billing, school-wide analytics                   |
| **platform admin**          | `/platform/dashboard`    | Cross-tenant: all schools, billing, provinces/districts/streams                                |

Auth: HTTP-only JWT cookies, refresh tokens, `lib/middleware/auth`, tenant isolation via `schoolId` on almost all APIs.

---

## 3. Public and authentication pages

| Route                     | File                                 | Purpose                                                                   |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `/`                       | `app/page.js`                        | Marketing landing — product overview, ECZ/Zambia positioning              |
| `/login`                  | `app/login/page.js`                  | School login (subdomain-aware); platform admin on apex domain             |
| `/register`               | `app/register/page.js`               | User registration (where enabled)                                         |
| `/register-school`        | `app/register-school/page.js`        | Redirect/entry to school onboarding                                       |
| `/onboarding`             | `app/onboarding/page.js`             | Multi-step school signup: email verify → plan (trial/paid) → portal setup |
| `/forgot-password`        | `app/forgot-password/page.js`        | Request password reset email                                              |
| `/reset-password`         | `app/reset-password/page.js`         | Reset password form                                                       |
| `/reset-password/[token]` | `app/reset-password/[token]/page.js` | Complete reset via token link                                             |
| `/attend`                 | `app/attend/page.js`                 | Standalone attendance check-in (QR/public flow)                           |
| `/hod`                    | `app/hod/page.js`                    | Redirect → `/dashboard/hod`                                               |

---

## 4. Student portal — all pages

**Home:** `/dashboard/student` — `app/dashboard/student/page.js`  
Overview: class summary, quick links, gamification-style widgets, links to study tools.

| Route                                 | File                           | Purpose                                                         |
| ------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `/dashboard/student`                  | `page.js`                      | Main student dashboard                                          |
| `/dashboard/profile`                  | `../profile/page.js`           | Profile (shared all roles)                                      |
| `/dashboard/feedback`                 | `../feedback/page.js`          | Submit feedback to school                                       |
| `/dashboard/student/class`            | `class/page.js`                | My class — roster, class teacher info                           |
| `/dashboard/student/subjects`         | `subjects/page.js`             | Enrolled subjects list                                          |
| `/dashboard/student/materials`        | `materials/page.js`            | Study materials from teachers/school                            |
| `/dashboard/timetable/student`        | `../timetable/student/page.js` | **My Timetable** — published grid (compact week view)           |
| `/dashboard/student/assessments`      | `assessments/page.js`          | **Assessments** — upcoming vs completed, filters                |
| `/dashboard/student/assessments/[id]` | `assessments/[id]/page.js`     | **Take assessment** — attempt UI, submit answers                |
| `/dashboard/student/flashcards`       | `flashcards/page.js`           | **AI Daily Flashcards** — generate deck (Groq), one/subject/day |
| `/dashboard/student/flashcards/[id]`  | `flashcards/[id]/page.js`      | Study flashcard deck (hidden answers until pick)                |
| `/dashboard/student/results`          | `results/page.js`              | View personal academic results                                  |
| `/dashboard/student/ecz-practice`     | `ecz-practice/page.js`         | ECZ-style practice questions (AI)                               |
| `/dashboard/student/study-assistant`  | `study-assistant/page.js`      | AI chat study helper (RAG when configured)                      |
| `/dashboard/student/code-playground`  | `code-playground/page.js`      | Code Playground — HTML/CSS preview + run via server API         |
| `/dashboard/student/virtual-lab`      | `virtual-lab/page.js`          | PhET virtual science lab (iframe)                               |
| `/dashboard/student/music`            | `music/page.js`                | Digital music composer (Innovation Hub)                         |
| `/dashboard/student/3d-shapes`        | `3d-shapes/page.js`            | 3D shape builder (STEM)                                         |
| `/dashboard/student/cultural`         | `cultural/page.js`             | Zambian cultural learning content                               |
| `/dashboard/student/goals`            | `goals/page.js`                | Personal learning goals                                         |
| `/dashboard/student/study-groups`     | `study-groups/page.js`         | Peer study groups hub                                           |
| `/dashboard/student/study-tools`      | `study-tools/page.js`          | Productivity / study utilities                                  |
| `/dashboard/student/learning-path`    | `learning-path/page.js`        | Personalized learning path (WIP)                                |
| `/dashboard/student/mock-exam`        | `mock-exam/page.js`            | Timed mock examinations                                         |
| `/dashboard/innovation`               | `../innovation/page.js`        | Innovation Hub launcher (role-filtered features)                |
| `/dashboard/privacy`                  | `../privacy/page.js`           | Privacy policy / settings                                       |

**Student sidebar items** (from `components/dashboard/Sidebar.js`): Dashboard, Profile, Give Feedback, My Class, Subjects, Materials, My Timetable, Assessments, Flashcards, Results, ECZ Practice, Study assistant, Code Playground, Innovation Hub, Privacy.

**Not in sidebar but exist:** cultural, goals, study-groups, study-tools, learning-path, mock-exam, 3d-shapes, music, virtual-lab (reachable via Innovation Hub).

---

## 5. Teacher portal — all pages

**Home:** `/dashboard/teacher` — `app/dashboard/teacher/page.js`  
Teacher command center: classes, quick actions, analytics snippets.

| Route                                           | File                                 | Purpose                                             |
| ----------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| `/dashboard/teacher`                            | `page.js`                            | Main teacher dashboard                              |
| `/dashboard/teacher/classes`                    | `classes/page.js`                    | Assigned classes overview                           |
| `/dashboard/subjects`                           | `../subjects/page.js`                | School subjects (shared; teachers use for context)  |
| `/dashboard/teacher/materials`                  | `materials/page.js`                  | Upload/manage study materials                       |
| `/dashboard/teacher/ai-materials`               | `ai-materials/page.js`               | Upload materials for AI/RAG grounding               |
| `/dashboard/timetable/teacher`                  | `../timetable/teacher/page.js`       | **My Timetable** — personal teaching schedule       |
| `/dashboard/teacher/games`                      | `games/page.js`                      | Educational games for classes                       |
| `/dashboard/teacher/lesson-planner`             | `lesson-planner/page.js`             | **AI Lesson Planner** — structured CBC lesson plans |
| `/dashboard/teacher/quiz-maker`                 | `quiz-maker/page.js`                 | **AI Quiz Maker**                                   |
| `/dashboard/teacher/report-comments`            | `report-comments/page.js`            | **AI Report Card Comments**                         |
| `/dashboard/teacher/story-weaver`               | `story-weaver/page.js`               | **AI Story Weaver**                                 |
| `/dashboard/teacher/assessments`                | `assessments/page.js`                | **Assessments hub** — create, list, manage          |
| `/dashboard/teacher/assessments/create`         | `assessments/create/page.js`         | Redirect → assessments with `?create=1`             |
| `/dashboard/teacher/assessments/[id]`           | `assessments/[id]/page.js`           | Run/manage live assessment session                  |
| `/dashboard/teacher/assessments/calendar`       | `assessments/calendar/page.js`       | Assessment calendar view                            |
| `/dashboard/teacher/assessments/ecz`            | `assessments/ecz/page.js`            | **ECZ SBA Hub** — rubrics, scores, evidence         |
| `/dashboard/teacher/assessments/question-bank`  | `assessments/question-bank/page.js`  | Question bank CRUD                                  |
| `/dashboard/teacher/ecz/submit`                 | `ecz/submit/page.js`                 | ECZ SBA submission workflow                         |
| `/dashboard/teacher/results`                    | `results/page.js`                    | Enter and manage student results                    |
| `/dashboard/teacher/lesson-plans`               | `lesson-plans/page.js`               | My lesson plans list                                |
| `/dashboard/teacher/lesson-plans/[id]`          | `lesson-plans/[id]/page.js`          | View/edit single lesson plan                        |
| `/dashboard/teacher/term-reports`               | `term-reports/page.js`               | Term report generation                              |
| `/dashboard/teacher/attendance`                 | `attendance/page.js`                 | Redirect → `/dashboard/attendance`                  |
| `/dashboard/attendance`                         | `../attendance/page.js`              | Mark class attendance                               |
| `/dashboard/teacher/schemes`                    | `schemes/page.js`                    | Schemes of work                                     |
| `/dashboard/teacher/reports`                    | `reports/page.js`                    | Reports navigation hub                              |
| `/dashboard/teacher/community`                  | `community/page.js`                  | Teacher community hub                               |
| `/dashboard/teacher/goals`                      | `goals/page.js`                      | Professional development goals                      |
| `/dashboard/teacher/virtual-lab`                | `virtual-lab/page.js`                | Virtual lab (teacher view)                          |
| `/dashboard/teacher/whiteboard`                 | `whiteboard/page.js`                 | Interactive digital whiteboard                      |
| `/dashboard/teacher/marketplace/my-submissions` | `marketplace/my-submissions/page.js` | Marketplace submission status                       |
| `/dashboard/payments`                           | `../payments/page.js`                | Payments (where enabled)                            |
| `/dashboard/innovation`                         | `../innovation/page.js`              | Innovation Hub                                      |
| `/dashboard/privacy`                            | `../privacy/page.js`                 | Privacy                                             |

**Teacher sidebar:** Dashboard, Profile, Give Feedback, My Classes, My Subjects, Upload for AI (RAG), Study Materials, My Timetable, Games, AI Lesson Planner, AI Quiz Maker, AI Report Comments, AI Story Weaver, Assessments, ECZ SBA Hub, Results, Innovation Hub, Privacy, Attendance, Payments, Term reports.

---

## 6. Head of Department (HOD) — all pages

**Home:** `/dashboard/hod` — `app/dashboard/hod/page.js`  
Department command center: stats, teacher roster, timetable snippet, lesson-plan queue, performance charts, links to all HOD tools, embeds `CreativeTeachingHub` and analytics.

| Route                                | File                                 | Purpose                                                                   |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------- |
| `/dashboard/hod`                     | `page.js`                            | Main HOD dashboard                                                        |
| `/dashboard/hod/allocation`          | `allocation/page.js`                 | **Class allocation** — teacher/subject/class periods, push to headteacher |
| `/dashboard/hod/timetable`           | `timetable/page.js`                  | **Department timetable** — published view + workload                      |
| `/dashboard/hod/lesson-plans`        | `lesson-plans/page.js`               | Review submitted lesson plans                                             |
| `/dashboard/hod/lesson-plans/[id]`   | `lesson-plans/[id]/page.js`          | Approve/reject single lesson plan                                         |
| `/dashboard/hod/exam-analysis`       | `exam-analysis/page.js`              | Department exam results analytics (charts)                                |
| `/dashboard/hod/teacher-performance` | `teacher-performance/page.js`        | Department teacher performance metrics                                    |
| `/dashboard/hod/term-reports`        | `term-reports/page.js`               | Term report generation panel                                              |
| `/dashboard/hod/games`               | `games/page.js`                      | Department games management                                               |
| `/dashboard/hod/cpd`                 | `cpd/page.js`                        | CPD progress by term/year                                                 |
| `/dashboard/hod/budget`              | `budget/page.js`                     | Department budget file (charts)                                           |
| `/dashboard/hod/correspondence`      | `correspondence/page.js`             | Incoming/outgoing correspondence log                                      |
| `/dashboard/hod/daily-routine`       | `daily-routine/page.js`              | Daily HOD task tracker                                                    |
| `/dashboard/hod/meetings`            | `meetings/page.js`                   | Department meetings                                                       |
| `/dashboard/hod/minutes`             | `minutes/page.js`                    | Meeting minutes hub                                                       |
| `/dashboard/hod/monitoring`          | `monitoring/page.js`                 | Monitoring hub (schemes, records, CPD links)                              |
| `/dashboard/hod/staff-meetings`      | `staff-meetings/page.js`             | Staff meeting records                                                     |
| `/dashboard/hod/stock-book`          | `stock-book/page.js`                 | Department stock/inventory book                                           |
| `/dashboard/classes`                 | `../classes/page.js`                 | My Classes (department context)                                           |
| `/dashboard/assessments`             | `../assessments/page.js`             | School assessments list                                                   |
| `/dashboard/teacher/assessments/ecz` | `../teacher/assessments/ecz/page.js` | ECZ SBA Hub                                                               |
| `/dashboard/results`                 | `../results/page.js`                 | Results                                                                   |
| `/dashboard/attendance`              | `../attendance/page.js`              | Attendance                                                                |
| `/dashboard/attendance/returns`      | `../attendance/returns/page.js`      | Attendance returns                                                        |
| `/dashboard/innovation`              | `../innovation/page.js`              | Innovation Hub                                                            |
| `/dashboard/timetable/hod`           | `../timetable/hod/page.js`           | Redirect → `/dashboard/hod/timetable`                                     |

**HOD sidebar:** Dashboard, Profile, Class Allocation, Department Timetable, Give Feedback, My Classes, Subjects, Games, AI tools (planner, quiz, RAG, report comments, story weaver), Teacher Performance, Assessments, ECZ SBA Hub, Results, Innovation Hub, Privacy, Attendance, Attendance Returns, Term reports.

**Note:** Many HOD “department file” pages (budget, correspondence, meetings, etc.) use UI structures that may be backed by sample data or partial APIs — verify before production reliance.

---

## 7. Headteacher / school admin — all pages

**Home:** `/dashboard/headteacher` — `app/dashboard/headteacher/page.js`  
Strategic goals, school KPIs, enrollment, links to administration tools.

| Route                                    | File                                      | Purpose                                                               |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `/dashboard/headteacher`                 | `page.js`                                 | Main headteacher dashboard                                            |
| `/dashboard/headteacher/classes`         | `classes/page.js`                         | School-wide classes management                                        |
| `/dashboard/headteacher/timetable`       | `timetable/page.tsx`                      | **Master timetable** — class wall grid, generate, save draft, publish |
| `/dashboard/headteacher/exam-tracking`   | `exam-tracking/page.js`                   | School-wide ECZ pass-rate analytics                                   |
| `/dashboard/headteacher/moe-reports`     | `moe-reports/page.js`                     | MOE reports + enrollment CSV export                                   |
| `/dashboard/headteacher/stem-monitoring` | `stem-monitoring/page.js`                 | STEM performance monitoring                                           |
| `/dashboard/users`                       | `../users/page.js`                        | User management                                                       |
| `/dashboard/feedback`                    | `../feedback/page.js`                     | Aggregate user feedback                                               |
| `/admin/registration`                    | `../../admin/registration/page.js`        | Register teachers, students, HODs                                     |
| `/dashboard/admin/recipes`               | `../admin/recipes/page.tsx`               | Scheduling recipes (timetable)                                        |
| `/admin/subjects`                        | `../../admin/subjects/page.js`            | Subject catalog                                                       |
| `/admin/teacher-performance`             | `../../admin/teacher-performance/page.js` | School-wide teacher performance                                       |
| `/dashboard/classes`                     | `../classes/page.js`                      | All classes                                                           |
| `/dashboard/assessments`                 | `../assessments/page.js`                  | All assessments                                                       |
| `/dashboard/results`                     | `../results/page.js`                      | School results                                                        |
| `/dashboard/attendance/returns`          | `../attendance/returns/page.js`           | Attendance returns                                                    |
| `/dashboard/payments`                    | `../payments/page.js`                     | Payments                                                              |
| `/dashboard/billing`                     | `../billing/page.js`                      | Subscription billing                                                  |
| `/dashboard/sms`                         | `../sms/page.js`                          | SMS logs                                                              |
| `/dashboard/reports`                     | `../reports/page.js`                      | Reports hub                                                           |
| `/dashboard/innovation`                  | `../innovation/page.js`                   | Innovation Hub                                                        |
| `/dashboard/admin`                       | `../admin/page.js`                        | Redirect → headteacher                                                |
| `/dashboard/timetable/master`            | `../timetable/master/page.js`             | Redirect → headteacher timetable                                      |

**Headteacher sidebar:** Full school admin set including User Management, Registration, Scheduling Recipes, Subjects, Teacher Performance, Classes, ECZ Exam Tracking, STEM Monitoring, MOE Reports, AI tools, Attendance Returns, Timetable, Assessments, ECZ SBA Hub, Results, Innovation Hub, Payments, Billing, Privacy, Reports.

---

## 8. Shared / multi-role dashboard pages

| Route                           | File                         | Roles            | Purpose                               |
| ------------------------------- | ---------------------------- | ---------------- | ------------------------------------- |
| `/dashboard`                    | `dashboard/page.js`          | all              | Role router / generic dashboard entry |
| `/dashboard/profile`            | `profile/page.js`            | all              | Profile view/edit, password           |
| `/dashboard/settings`           | `settings/page.js`           | all              | Account and school settings           |
| `/dashboard/feedback`           | `feedback/page.js`           | all / HT         | Submit or view feedback               |
| `/dashboard/classes`            | `classes/page.js`            | teacher, hod, HT | Class lists                           |
| `/dashboard/subjects`           | `subjects/page.js`           | admin paths      | Subjects management                   |
| `/dashboard/materials`          | `materials/page.js`          | multi            | Materials library                     |
| `/dashboard/assessments`        | `assessments/page.js`        | multi            | Role-adaptive assessments index       |
| `/dashboard/assessments/create` | `assessments/create/page.js` | teacher+         | Multi-step assessment creator         |
| `/dashboard/results`            | `results/page.js`            | multi            | Results hub                           |
| `/dashboard/attendance`         | `attendance/page.js`         | teacher, hod     | Attendance marking                    |
| `/dashboard/attendance/returns` | `attendance/returns/page.js` | HT               | Returns submission                    |
| `/dashboard/timetable`          | `timetable/page.js`          | multi            | Timetable router                      |
| `/dashboard/timetable/student`  | `timetable/student/page.js`  | student          | Student timetable                     |
| `/dashboard/timetable/teacher`  | `timetable/teacher/page.js`  | teacher          | Teacher timetable                     |
| `/dashboard/timetable/hod`      | `timetable/hod/page.js`      | hod              | Redirect to HOD timetable             |
| `/dashboard/timetable/master`   | `timetable/master/page.js`   | HT               | Redirect to master timetable          |
| `/dashboard/innovation`         | `innovation/page.js`         | multi            | Innovation Hub                        |
| `/dashboard/payments`           | `payments/page.js`           | multi            | Lipila mobile money                   |
| `/dashboard/billing`            | `billing/page.js`            | HT               | School subscription                   |
| `/dashboard/privacy`            | `privacy/page.js`            | all              | Privacy                               |
| `/dashboard/reports`            | `reports/page.js`            | staff            | Reports                               |
| `/dashboard/sms`                | `sms/page.js`                | HT               | SMS interaction logs                  |
| `/dashboard/sdg`                | `sdg/page.js`                | multi            | UN SDG tracking                       |
| `/dashboard/users`              | `users/page.js`              | HT               | Users CRUD                            |

---

## 9. School admin routes (`/admin`)

| Route                        | File                                | Purpose                                                 |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `/admin/registration`        | `admin/registration/page.js`        | Bulk/single user registration (teachers, students, HOD) |
| `/admin/subjects`            | `admin/subjects/page.js`            | Manage school subject catalog                           |
| `/admin/teacher-performance` | `admin/teacher-performance/page.js` | Teacher performance dashboards                          |
| `/admin/schools/register`    | `admin/schools/register/page.js`    | Register new school (legacy/admin)                      |

---

## 10. Platform operator (`/platform`)

Cross-tenant console for **Blue Peak / platform** staff (not school users).

| Route                 | File                         | Purpose                                     |
| --------------------- | ---------------------------- | ------------------------------------------- |
| `/platform/login`     | `platform/login/page.js`     | Platform login                              |
| `/platform/dashboard` | `platform/dashboard/page.js` | All schools list, filters, activate/suspend |
| `/platform/overview`  | `platform/overview/page.js`  | Platform KPIs (trial, active, etc.)         |
| `/platform/billing`   | `platform/billing/page.js`   | Cross-school billing summary                |
| `/platform/health`    | `platform/health/page.js`    | Health checks                               |
| `/platform/provinces` | `platform/provinces/page.js` | Zambia provinces                            |
| `/platform/districts` | `platform/districts/page.js` | Districts                                   |
| `/platform/streams`   | `platform/streams/page.js`   | Reporting streams                           |
| `/platform/profile`   | `platform/profile/page.js`   | Platform admin profile                      |

Pilot school join notifications: email via `PILOT_NOTIFY_EMAILS` on onboarding complete (`/api/onboarding/complete`).

---

## 11. Marketplace

| Route                                           | File                                                   | Purpose                                       |
| ----------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `/marketplace`                                  | `marketplace/page.js`                                  | Browse approved shared teaching materials     |
| `/marketplace/[id]`                             | `marketplace/[id]/page.js`                             | Resource detail, ratings, download to library |
| `/dashboard/teacher/marketplace/my-submissions` | `dashboard/teacher/marketplace/my-submissions/page.js` | Teacher submission tracker (HOD approve flow) |

**APIs:** `/api/marketplace`, `/api/marketplace/[id]`, submit, rate, download, review.

---

## 12. Innovation Hub and creative features

**Entry:** `/dashboard/innovation` → `InnovationHub` + `CreativeTeachingHub` components.

Features are stored in `CreativeFeature` (per school) and exposed via `GET /api/creative-features`. Routes map:

| featureId                | Route                                | Category | Typical roles       |
| ------------------------ | ------------------------------------ | -------- | ------------------- |
| `interactive_whiteboard` | `/dashboard/teacher/whiteboard`      | creative | all staff + student |
| `ai_story_generator`     | `/dashboard/teacher/story-weaver`    | creative | teacher, hod, HT    |
| `music_composer`         | `/dashboard/student/music`           | creative | student, teacher    |
| `virtual_lab`            | `/dashboard/student/virtual-lab`     | stem     | all                 |
| `code_playground`        | `/dashboard/student/code-playground` | stem     | all                 |
| `3d_modeler`             | `/dashboard/student/3d-shapes`       | stem     | all                 |
| `ai_lesson_planner`      | `/dashboard/teacher/lesson-planner`  | creative | teacher, hod, HT    |
| `ai_quiz_maker`          | `/dashboard/teacher/quiz-maker`      | creative | teacher, hod, HT    |
| `ai_report_comments`     | `/dashboard/teacher/report-comments` | creative | teacher, hod, HT    |
| `ecz_practice`           | `/dashboard/student/ecz-practice`    | stem     | all                 |

Embedded components: `InteractiveWhiteboard`, `MultimediaLessonCreator`, `VirtualFieldTrips`, `StudentWorkShowcase`, `AIStoryWeaver`, `DigitalMusicComposer`, `VirtualScienceLab`, `CodePlayground`.

---

## 13. Assessments — complete reference

### 13.1 UI pages (every assessment-related screen)

| Route                                          | Who              | Purpose                                            |
| ---------------------------------------------- | ---------------- | -------------------------------------------------- |
| `/dashboard/assessments`                       | HT, HOD, teacher | School-wide or role-filtered assessment list       |
| `/dashboard/assessments/create`                | teacher+         | Create assessment wizard                           |
| `/dashboard/teacher/assessments`               | teacher          | Teacher assessment hub — tabs, create, search      |
| `/dashboard/teacher/assessments/create`        | teacher          | Redirect to create flow                            |
| `/dashboard/teacher/assessments/[id]`          | teacher          | Live session / proctor view                        |
| `/dashboard/teacher/assessments/calendar`      | teacher          | Calendar of assessments                            |
| `/dashboard/teacher/assessments/ecz`           | teacher, hod, HT | **ECZ SBA Hub** — competencies, rubrics, evidence  |
| `/dashboard/teacher/assessments/question-bank` | teacher          | Reusable question bank                             |
| `/dashboard/teacher/ecz/submit`                | teacher          | Formal ECZ submission                              |
| `/dashboard/student/assessments`               | student          | My assessments — upcoming/completed                |
| `/dashboard/student/assessments/[id]`          | student          | **Attempt** — answer questions, submit             |
| `/dashboard/student/mock-exam`                 | student          | Timed mock exams (separate from class assessments) |

### 13.2 Data models

- **`Assessment`** — class assessments (title, type, dates, linked class/subject).
- **`Assignment`** / **`AssignmentSubmission`** — homework-style assignments.
- **`QuestionBank`** — reusable questions.
- **ECZ cluster:** `EczAssessment`, `EczRubric`, `EczRubricCriterion`, `EczAssessmentScore`, `EczEvidenceFile`, `EczSubmission`, `EczCompetency`, `EczSubjectConstruct`, `SubjectConstructElement`, `SpecialAccommodation`.
- **`MockExamAttempt`** — student mock exam runs.

### 13.3 APIs (assessments & ECZ)

| API path                                       | Methods            | Purpose                                                             |
| ---------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `/api/assessments`                             | GET, POST          | List/create assessments                                             |
| `/api/assessments/[id]`                        | GET, PATCH, DELETE | Single assessment                                                   |
| `/api/assessments/[id]/attempts`               | GET, POST          | Student attempts                                                    |
| `/api/assessments/sba-tasks`                   | GET, POST          | SBA tasks                                                           |
| `/api/student/assessments`                     | GET                | Student’s assigned assessments                                      |
| `/api/assignments`                             | GET, POST          | Assignments                                                         |
| `/api/assignments/[id]/submissions`            | GET, POST          | Submissions                                                         |
| `/api/question-bank`                           | GET, POST          | Question bank                                                       |
| `/api/question-bank/[id]`                      | GET, PATCH, DELETE | Single question                                                     |
| `/api/ecz/*`                                   | various            | Full ECZ reference data, assessments, scores, evidence, submissions |
| `/api/ai/ecz-practice`                         | POST               | AI-generated ECZ practice                                           |
| `/api/dashboard/teacher/assessments-analytics` | GET                | Teacher analytics                                                   |

### 13.4 Teacher assessment workflow

1. Create assessment (`/dashboard/teacher/assessments` or `/dashboard/assessments/create`).
2. Assign to class — linked via teaching assignments / class.
3. Students see under `/dashboard/student/assessments`.
4. Student attempts at `/dashboard/student/assessments/[id]`.
5. Teacher monitors at `/dashboard/teacher/assessments/[id]`.
6. Results may feed `/dashboard/teacher/results` and HOD `/dashboard/hod/exam-analysis`.

### 13.5 ECZ SBA workflow

1. Configure constructs/rubrics via ECZ APIs and hub UI.
2. Enter scores and upload evidence (`/dashboard/teacher/assessments/ecz`).
3. Submit via `/dashboard/teacher/ecz/submit`.
4. HOD/HT review school-wide performance in exam tracking and MOE reports.

---

## 14. Timetable — complete reference

### 14.1 UI pages

| Route                              | Who     | Purpose                                                             |
| ---------------------------------- | ------- | ------------------------------------------------------------------- |
| `/dashboard/headteacher/timetable` | HT      | **Master builder** — class wall grid, generate, sync draft, publish |
| `/dashboard/hod/timetable`         | HOD     | Department published timetable + workload                           |
| `/dashboard/hod/allocation`        | HOD     | Push teacher allocations (periods/week)                             |
| `/dashboard/timetable/teacher`     | teacher | Personal teaching timetable (compact grid)                          |
| `/dashboard/timetable/student`     | student | Class timetable (compact grid)                                      |
| `/dashboard/admin/recipes`         | HT      | Scheduling recipes                                                  |
| `/dashboard/timetable`             | multi   | Router/hub                                                          |

### 14.2 Workflow

1. **HOD** sets allocations (`TeacherAllocation` — pushed status) per term/year.
2. **Headteacher** generates timetable (`POST /api/timetable/generate`) or uses solver (`/api/timetable/solver/*`).
3. **Save draft** → `POST /api/timetable/entries/sync-draft` (required before publish if only in-memory).
4. **Publish** → `POST /api/timetable/publish` flips `TimetableAllocationEntry` to `published`.
5. **Teachers/students** load `GET /api/timetable/view?status=published`.

### 14.3 Key APIs

| API                                       | Purpose                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `/api/timetable/config`                   | Bell schedule, working days                            |
| `/api/timetable/generate`                 | Greedy + optional LLM conflict resolution              |
| `/api/timetable/publish`                  | Draft → published                                      |
| `/api/timetable/view`                     | Role-filtered view (student by class, teacher by user) |
| `/api/timetable/entries/sync-draft`       | Persist UI assignments                                 |
| `/api/timetable/allocations/push`         | HOD push allocations                                   |
| `/api/timetable/teacher-colors`           | Teacher color map                                      |
| `/api/timetable/solver/generate`          | External solver                                        |
| `/api/timetable/teacherPeriodAssignments` | Period assignments                                     |
| `/api/admin/master-timetable`             | Legacy master entry                                    |

### 14.4 Components

- `AscClassWallGrid` — aSc-style class × period grid (headteacher).
- `CompactWeekTimetableGrid` — admin-style small grid (teacher/student).
- `TimetableSummary` — dashboard widget.

---

## 15. Attendance

| Route                           | Purpose                 |
| ------------------------------- | ----------------------- |
| `/dashboard/attendance`         | Web attendance register |
| `/dashboard/attendance/returns` | Returns to MOE          |
| `/dashboard/teacher/attendance` | Redirect to attendance  |
| `/attend`                       | Public/QR attend page   |

**APIs:** `/api/attendance`, `/api/attendance/qr-mark`, `/api/dashboard/headteacher/attendance/*`, `/api/mobile/attendance/*` (sessions, marks).

**Mobile:** `zsms-mobile` tabs for attendance, sessions, history, face enrollment.

---

## 16. Lesson plans and term reports

| Route                                  | Purpose              |
| -------------------------------------- | -------------------- |
| `/dashboard/teacher/lesson-planner`    | AI generate          |
| `/dashboard/teacher/lesson-plans`      | List                 |
| `/dashboard/teacher/lesson-plans/[id]` | Detail               |
| `/dashboard/hod/lesson-plans`          | HOD approval queue   |
| `/dashboard/hod/lesson-plans/[id]`     | Approve/reject       |
| `/dashboard/teacher/term-reports`      | Teacher term reports |
| `/dashboard/hod/term-reports`          | HOD term reports     |

**APIs:** `/api/lesson-plans/*`, `/api/ai/lesson-planner`, `/api/ai/term-reports/*`, `/api/lesson-plans/hod/pending`.

---

## 17. Results and ECZ / SBA

| Route                                  | Purpose                   |
| -------------------------------------- | ------------------------- |
| `/dashboard/results`                   | School results entry/view |
| `/dashboard/student/results`           | Student view              |
| `/dashboard/teacher/results`           | Teacher entry             |
| `/dashboard/headteacher/exam-tracking` | ECZ tracking analytics    |
| `/dashboard/hod/exam-analysis`         | Department exam charts    |

**APIs:** `/api/student/results`, `/api/teacher/results/export`, `/api/dashboard/exam-tracking`, `/api/dashboard/hod/exam-analysis`, full `/api/ecz/*` tree.

---

## 18. AI features

| Feature             | Page                                 | API                                                    | Notes                                          |
| ------------------- | ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------- |
| Lesson planner      | `/dashboard/teacher/lesson-planner`  | `/api/ai/lesson-planner`, `/api/lesson-plans/generate` | Groq + Zod schemas                             |
| Quiz maker          | `/dashboard/teacher/quiz-maker`      | `/api/ai/quiz-maker`, `/api/aiml/quiz-maker`           |                                                |
| Story weaver        | `/dashboard/teacher/story-weaver`    | `/api/ai/story-weaver`                                 |                                                |
| Report comments     | `/dashboard/teacher/report-comments` | `/api/ai/report-comments`                              |                                                |
| Study assistant     | `/dashboard/student/study-assistant` | `/api/ai/study-assistant`                              | RAG optional                                   |
| Flashcards          | `/dashboard/student/flashcards`      | `/api/student/flashcards`                              | Needs `GROQ_API_KEY`; quota via `checkAILimit` |
| ECZ practice        | `/dashboard/student/ecz-practice`    | `/api/ai/ecz-practice`                                 |                                                |
| RAG materials       | `/dashboard/teacher/ai-materials`    | `/api/materials/ingest`                                | HuggingFace embeddings                         |
| Phonics trainer     | (feature flag)                       | `/api/ai/phonics-trainer`                              |                                                |
| Competency analyzer |                                      | `/api/ai/competency-analyzer`                          |                                                |

**Usage limits:** `lib/middleware/aiUsageTracker.js` — trial/basic/standard/premium monthly caps.

---

## 19. Billing, payments, and onboarding

| Route / flow             | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `/onboarding`            | School signup, trial or Lipila payment    |
| `/api/onboarding/*`      | start, verify, select-plan, pay, complete |
| `/dashboard/billing`     | School subscription status                |
| `/dashboard/payments`    | Payment history                           |
| `/api/payments/lipila/*` | Mobile money                              |
| `/api/billing/*`         | Invoices, plans                           |
| `/platform/billing`      | Platform-wide billing                     |

---

## 20. API surface (by domain)

Top-level folders under `app/api/` (each contains one or more `route.js` / `route.ts`):

| Domain              | Folder                                                                                                                          | Examples                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Auth                | `auth/`                                                                                                                         | login, refresh, me, forgot/reset password                    |
| Onboarding          | `onboarding/`                                                                                                                   | start, verify, pay, complete                                 |
| Students            | `student/`, `students/`                                                                                                         | flashcards, goals, materials, subjects, assessments, results |
| Teachers            | `teacher/`, `teachers/`                                                                                                         | pupils, results export                                       |
| Classes             | `classes/`                                                                                                                      | CRUD, students bulk                                          |
| Subjects            | `subjects/`                                                                                                                     | list, by-category                                            |
| Timetable           | `timetable/`                                                                                                                    | view, generate, publish, config, solver                      |
| Allocations         | `allocations/`                                                                                                                  | department push, HOD classes                                 |
| Assessments         | `assessments/`, `assignments/`, `question-bank/`                                                                                | full assessment lifecycle                                    |
| ECZ                 | `ecz/`                                                                                                                          | SBA, rubrics, evidence, submissions                          |
| Attendance          | `attendance/`, `mobile/attendance/`                                                                                             | web + mobile sessions                                        |
| Lesson plans        | `lesson-plans/`                                                                                                                 | CRUD, comments, export, HOD pending                          |
| AI                  | `ai/`, `aiml/`                                                                                                                  | all AI generators                                            |
| Materials           | `materials/`                                                                                                                    | ingest for RAG                                               |
| Marketplace         | `marketplace/`                                                                                                                  | browse, submit, rate, review                                 |
| Dashboard analytics | `dashboard/`                                                                                                                    | headteacher, hod, teacher, student, moe-reports              |
| Platform            | `platform/`                                                                                                                     | schools, stats, billing, health                              |
| Admin               | `admin/`                                                                                                                        | schools, repair, allocations reject                          |
| Mobile              | `mobile/`                                                                                                                       | auth, sync, push, attendance                                 |
| Code playground     | `code-playground/execute`                                                                                                       | Run student code server-side                                 |
| Creative            | `creative-features/`                                                                                                            | Innovation Hub feature list                                  |
| Misc                | `health`, `ping`, `csrf-token`, `features/check-access`, `sms`, `feedback`, `cron`, `ussd`, `recipes`, `v1/teacher-performance` |

**Total route files:** 265+ (count all `app/api/**/route.*`).

---

## 21. Database (Prisma models)

**72 models** — grouped by domain:

| Domain                  | Models                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy & auth          | School, User, RefreshToken, SchoolRegistration, PlatformAdmin, AuditLog, SchoolPlanPayment                                                                                                                                                                                                    |
| People                  | Student, Teacher, HeadOfDepartment                                                                                                                                                                                                                                                            |
| Academics               | Class, Subject, Department, PupilSubjectEnrollment, TeachingAssignment, TeacherDepartment, TeacherTermProgress                                                                                                                                                                                |
| Timetable               | TimetableConfig, TimeSlot, TimetableAllocationEntry, TeacherAllocation, TeacherColor, TimetableNotification, TimetableVersion, TimetableEntry, TeacherPeriodAssignment, SchedulingRecipe, RecipeBlock, RecipeConstraint, Constraint, Substitution, MasterTimetableEntry, DepartmentAllocation |
| Assessment & results    | Assessment, Assignment, AssignmentSubmission, QuestionBank, Result, ResultsStatus, MockExamAttempt                                                                                                                                                                                            |
| ECZ                     | EczCompetency, EczSubjectConstruct, SubjectConstructElement, EczAssessment, EczAssessmentCompetency, EczAssessmentItem, EczRubric, EczRubricCriterion, EczAssessmentScore, EczEvidenceFile, EczSubmission, SpecialAccommodation                                                               |
| Attendance              | Attendance, AttendanceSession, AttendanceMark                                                                                                                                                                                                                                                 |
| Lesson plans            | LessonPlan, LessonPlanComment, TermReport                                                                                                                                                                                                                                                     |
| Materials & marketplace | StudyMaterial, SchoolMaterial, StudentMaterial, MaterialChunk, SharedMaterial, MaterialRating                                                                                                                                                                                                 |
| Student engagement      | StudentFlashcardDeck, Goal, Game, StudentGame, GamificationProfile, Badge, StudentBadge, StudentWork, Activity, ActivityParticipant                                                                                                                                                           |
| AI & billing            | AIRequest, AIUsageLog, CreativeFeature                                                                                                                                                                                                                                                        |
| Other                   | Feedback, StrategicGoal, StrategicReview, FieldTrip, Note, BookLoan, AllocationNotification, Classroom                                                                                                                                                                                        |

---

## 22. Mobile app (`zsms-mobile`)

**Package:** `com.bluepeack.zsms.teacher` — Expo Router, primarily **teacher** workflows.

| Route                           | Screen                         | Purpose       |
| ------------------------------- | ------------------------------ | ------------- |
| `/`                             | `app/index.tsx`                | Auth redirect |
| `/(auth)/school-select`         | Pick school subdomain          |
| `/(auth)/login`                 | Email/password login           |
| `/(tabs)`                       | Home — today summary           |
| `/(tabs)/attendance`            | Class picker                   |
| `/(tabs)/scores`                | SBA / scores home              |
| `/(tabs)/profile`               | Profile, logout, offline queue |
| `/attendance/[classId]`         | Class register                 |
| `/attendance/session/[classId]` | Active session                 |
| `/attendance/history`           | Past sessions                  |
| `/lesson-plans`                 | Lesson plans list              |
| `/lesson-plans/[id]`            | Lesson plan detail             |
| `/scores/[assessmentId]`        | Score entry                    |
| `/scores/student/[studentId]`   | Per-student scores             |
| `/student/timetable`            | Student timetable (secondary)  |
| `/student/results`              | Student results                |
| `/student/notices`              | Notices                        |
| `/student/ecz-practice`         | ECZ practice                   |

**APIs used:** `/api/mobile/auth/login`, `/api/mobile/sync`, `/api/mobile/push/register`, `/api/mobile/attendance/sessions/*`.

**Offline:** `lib/store/offlineQueue.js` — queue marks when offline.

**Face:** `FaceEnrollPanel`, `expo-face-detection` (Android dev client) — requires native build.

---

## 23. Sidebar navigation vs routes

Many pages exist **without** a sidebar link (reachable via Innovation Hub, dashboards, or direct URL):

- Student: `cultural`, `goals`, `study-groups`, `study-tools`, `learning-path`, `mock-exam`, `3d-shapes`, `music`, `virtual-lab`
- Teacher: `community`, `schemes`, `reports`, `virtual-lab`, `goals`, `marketplace/my-submissions`
- HOD: all department file pages (`budget`, `correspondence`, `meetings`, etc.)

When auditing UX, either add sidebar links or document these as secondary entry points only.

---

## 24. Known gaps and production notes

| Area                      | Status                     | Notes                                                    |
| ------------------------- | -------------------------- | -------------------------------------------------------- |
| Flashcards                | Needs `GROQ_API_KEY`       | 503 if missing; show real error after deploy             |
| Timetable publish         | Must save draft first      | Publish auto-syncs draft in headteacher UI               |
| Student/teacher timetable | Requires published entries | Same term/year as publish (`Term 1`, current year)       |
| Code Playground Python+   | Needs `PISTON_API_KEY`     | JS runs via `/api/code-playground/execute` without key   |
| Piston public API         | 401 without key            | emkc.org now requires authorization                      |
| HOD department files      | Partial                    | Some pages use placeholder/sample data                   |
| Browser console noise     | Extensions                 | `contentscript.js`, MetaMask — not app bugs              |
| `expo-face-detection`     | Mobile only                | Not in npm `package.json` until added; Android dev build |
| Pilot school emails       | `PILOT_NOTIFY_EMAILS`      | Alert on trial onboarding complete                       |

---

## 25. Appendix — page count summary

| Category                                             | Count    |
| ---------------------------------------------------- | -------- |
| All `app/**/page.*`                                  | **127**  |
| Student-specific under `/dashboard/student/`         | **21**   |
| Teacher-specific under `/dashboard/teacher/`         | **28**   |
| HOD-specific under `/dashboard/hod/`                 | **18**   |
| Headteacher-specific under `/dashboard/headteacher/` | **6**    |
| Public / auth / marketing                            | **11**   |
| Platform                                             | **8**    |
| Admin (`/admin`)                                     | **4**    |
| Marketplace                                          | **2**    |
| Shared dashboard                                     | **~25**  |
| API route files                                      | **265+** |
| Prisma models                                        | **72**   |
| Mobile screens                                       | **20**   |

---

_This document is the exhaustive page-level companion to `review.md` (architecture and product summary). For deployment, see `README.md`, `docs/ENVIRONMENT.md`, and `CHANGELOG.md`._
