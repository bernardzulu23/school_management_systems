# 🇿🇲 Zambian School Management System (ZSMS) — Next.js Multi‑Tenant Web App + API

This repository is a full-stack **Next.js (App Router)** application that provides:

- A multi-tenant web UI (per-school subdomain)
- A JSON API used by the web UI and intended for mobile clients (Android/iOS)
- A PostgreSQL database accessed via Prisma

This README is intentionally **detailed** to help you integrate the same backend with an Android app.

> Note on “no omissions”: the codebase is large and evolving. This document is an accurate, comprehensive snapshot of what exists **in this repository right now**, including a full route catalog extracted from the `app/` and `app/api/` directories. If you add/remove routes or models later, update the relevant sections.

---

## Table of Contents

- Overview
- Stack & Architecture
- Multi‑Tenancy (Schools/Subdomains)
- Roles & Access Model
- Authentication & Session (Web + Mobile)
- Database (Prisma) Schema Overview
- API Reference (route catalog)
- Web Routes (page catalog)
- Email Password Reset (SendGrid)
- Attendance (Real DB-backed)
- UI Theme / Color Palette
- Offline / PWA Notes
- Android Integration Guide
- Environment Variables
- Scripts & Local Development
- Deployment Notes
- Known Constraints / TODOs

---

## Overview

ZSMS supports multiple school users and dashboards:

- **Headteacher/Admin**: manage school users, classes, subjects, and high-level dashboards
- **HOD (Head of Department)**: department dashboards, staff/subject oversight
- **Teacher**: teaching dashboards, assessments, materials, results, attendance, class management
- **Student**: learning dashboard, subjects, assessments, results, materials, goals, games

Core concepts:

- Every record is scoped by a `schoolId` (multi-tenancy)
- Auth uses **JWT** stored in **HTTP-only cookies** (web-first), with optional Bearer token support
- Password reset uses **SendGrid** and token hashing

---

## Stack & Architecture

**Runtime**

- Next.js (App Router): `next` from [package.json](package.json)
- React 18
- Node.js custom server for production: [server.js](server.js)

**Data**

- Prisma ORM + PostgreSQL: [schema.prisma](prisma/schema.prisma)

**State / Data fetching**

- React Query (`@tanstack/react-query`)
- Zustand for auth/session state: [auth.js](lib/auth.js)

**UI**

- Tailwind CSS: [tailwind.config.js](tailwind.config.js)
- Theme switching via `next-themes`
- Icon set: `lucide-react`

**Email**

- SendGrid (`@sendgrid/mail`): [email.js](config/email.js)

---

## Multi‑Tenancy (Schools/Subdomains)

### How a school is identified

Most API routes call `getSchoolIdFromRequest()` which resolves the `schoolId` using:

1. `x-school-id` header (explicit school id)
2. Subdomain resolution:
   - explicit `subdomain` argument (commonly passed from the client on login)
   - or `x-school-subdomain` header
   - or parsing the `Host` header
3. Dev fallback: the first active school

Implementation: [getSchoolIdFromRequest](lib/utils/getSchoolId.js)

### Production usage pattern

Your production domain is expected to look like:

`https://{schoolSubdomain}.{rootDomain}/...`

Example: `https://ndakedaysecondaryschool.bluepeacktechnologies.com/login`

For mobile clients, the simplest approach is:

- Use the **school subdomain base URL** as the API base URL
- Or set `x-school-subdomain` on requests when you can’t use subdomains (not recommended unless necessary)

---

## Roles & Access Model

User roles are stored in `User.role` (string) and commonly used values are:

- `headteacher` / `admin` / `administrator` / `superadmin`
- `hod` / `head of department`
- `teacher`
- `student`

Role alias rules are in: [roleCheck](lib/middleware/auth.js)

Important: Some users can have both `teacherProfile` and `hodProfile`. The UI header exposes quick navigation links for switching between dashboards when those profiles exist.

Header layout: [SimpleDashboardLayout.js](components/dashboard/SimpleDashboardLayout.js)

---

## Authentication & Session (Web + Mobile)

### Tokens

Login sets cookies:

- `access_token` (JWT, ~15 minutes)
- `refresh_token` (JWT, ~7 days)

Auth middleware supports:

- Cookie-based auth via `access_token`
- Or `Authorization: Bearer <token>` header

Middleware: [authMiddleware](lib/middleware/auth.js)

### Web session sync

The web app keeps `user` in Zustand storage and periodically calls:

- `GET /api/auth/me`
- if 401, tries `POST /api/auth/refresh`, then calls `/api/auth/me` again

Client state: [useAuth](lib/auth.js)

### Mobile client (Android) options

You have two supported integration patterns:

1. **Cookie-based session** (recommended if you keep the backend unchanged)
   - Use an HTTP client that supports cookies (OkHttp CookieJar)
   - Call `POST /api/auth/login` and store cookies
   - Include cookies for future requests
2. **Bearer token session**
   - The backend supports Bearer tokens, but the current `POST /api/auth/login` response does not return the access token in JSON.
   - If you want pure token auth on Android (no cookies), you can extend the login route to also return `accessToken` and `refreshToken`.

---

## Database (Prisma) Schema Overview

The Prisma datasource is PostgreSQL:

- [schema.prisma](prisma/schema.prisma#L9-L12)

### Multi-tenant root

- `School` is the tenant boundary (subdomain, domain, logo, timezone, etc.)
- Most models include `schoolId` and a `school` relation.

### Core identity models

- `User`: login identity, role, profile image, password reset token fields
- `Student`: academic profile + guardian/medical details, results, attendance, enrollments
- `Teacher`: staff profile, department membership, teaching assignments
- `HeadOfDepartment`: HOD profile linked to user + department reference

### Academic models

- `Class`: class metadata (name/year_group/section)
- `Subject`: subject metadata (name/code/topics) and teacher relation
- `TeachingAssignment`: (teacherId + classId + subjectId) explicit mapping
- `PupilSubjectEnrollment`: (student + class + subject) enrollment mapping
- `Result`: linked to `Student` and `Subject`

### Engagement / content models

- `StudyMaterial`, `StudentMaterial`
- `Assignment`, `AssignmentSubmission`
- `Assessment`
- `StudentWork`
- `Goal`
- `Game`, `StudentGame`
- `Attendance`
- `Feedback`
- `Activity`, `ActivityParticipant`
- `GamificationProfile`, `Badge`, `StudentBadge`
- `FieldTrip`

For the full canonical list of models and their fields, refer to:

- [schema.prisma](prisma/schema.prisma)

---

## API Reference (route catalog)

All API routes are in `app/api/**/route.js`.

### Auth

- `POST /api/auth/login` — login, sets cookies, requires school context (subdomain)
  - Implementation: [login route](app/api/auth/login/route.js)
- `POST /api/auth/logout` — clears cookies
  - [logout route](app/api/auth/logout/route.js)
- `POST /api/auth/refresh` — refresh access token using refresh cookie
  - [refresh route](app/api/auth/refresh/route.js)
- `GET /api/auth/me` — returns current user + profiles
  - [me route](app/api/auth/me/route.js)
- `POST /api/auth/register` — registers a user (scoped to school)
  - [register route](app/api/auth/register/route.js)
- `POST /api/auth/forgot-password` — generates reset token and emails link
  - [forgot-password route](app/api/auth/forgot-password/route.js)
- `POST /api/auth/reset-password/[token]` — resets password using token
  - [reset-password token route](app/api/auth/reset-password/[token]/route.js)
- `POST /api/auth/reset-password` — legacy reset endpoint (token in body)
  - [reset-password legacy route](app/api/auth/reset-password/route.js)

### School

- `GET /api/school/current` — returns the current school info (logo/name/etc)
  - supports `?subdomain=...`
  - [school/current route](app/api/school/current/route.js)

### Dashboards

- `GET /api/dashboard/stats` — top-level stats
  - [dashboard/stats route](app/api/dashboard/stats/route.js)
- `GET /api/dashboard/headteacher` — headteacher dashboard
  - [dashboard/headteacher route](app/api/dashboard/headteacher/route.js)
- `GET /api/dashboard/headteacher/classes` — class list/overview for headteacher
  - [dashboard/headteacher/classes route](app/api/dashboard/headteacher/classes/route.js)
- `GET /api/dashboard/hod` — HOD dashboard (department-scoped)
  - [dashboard/hod route](app/api/dashboard/hod/route.js)
- `GET /api/dashboard/teacher` — teacher dashboard (classes/subjects/assignments)
  - [dashboard/teacher route](app/api/dashboard/teacher/route.js)
- `GET /api/dashboard/student` — student dashboard
  - [dashboard/student route](app/api/dashboard/student/route.js)
- `GET /api/dashboard/student/games` — student games dashboard
  - [dashboard/student/games route](app/api/dashboard/student/games/route.js)

### Teaching assignments / enrollments

- `GET /api/teaching-assignments` — teaching assignments for current teacher (fallback to teacher profile if no TeachingAssignment rows)
  - [teaching-assignments route](app/api/teaching-assignments/route.js)

### Attendance

- `GET /api/classes/students?classId=...` — returns students for a class (supports both class-name mapping and enrollment mapping)
  - [classes/students route](app/api/classes/students/route.js)
- `POST /api/attendance` — upserts daily attendance records
  - [attendance route](app/api/attendance/route.js)

### CRUD / misc (selected)

This codebase contains additional CRUD endpoints, including:

- Users: `/api/users`, `/api/users/[id]`, `/api/users/[id]/password`
- Teachers: `/api/teachers`, `/api/teachers/[id]`, `/api/teachers/[id]/departments`
- Students: `/api/students`, `/api/students/[id]`
- Subjects: `/api/subjects`, `/api/subjects/[id]`, `/api/v1/subjects/by-category`
- Classes: `/api/classes`, `/api/classes/[id]`, `/api/classes/[id]/students`
- Assessments: `/api/assessments`, `/api/assessments/[id]`
- Assignments: `/api/assignments`, `/api/assignments/[id]`
- Student-facing: `/api/student/subjects`, `/api/student/assessments`, `/api/student/materials`, `/api/student/results`, `/api/student/goals`
- Media uploads: `/api/profile/picture`, `/api/profile/picture/file/[filename]`, `/api/account/profile-picture`
- HOD assignment management: `/api/hods`, `/api/hods/[id]`, `/api/hods/assign`
- Utilities: `/api/health`, `/api/ping`

For a full exact list, see `app/api/**/route.js` in this repo.

---

## Web Routes (page catalog)

All pages are in `app/**/page.js`. Key screens:

**Public**

- `/` — landing page: [app/page.js](app/page.js)
- `/login` — login: [login page](app/login/page.js)
- `/register` — registration: [register page](app/register/page.js)
- `/forgot-password` — forgot password: [forgot-password page](app/forgot-password/page.js)
- `/reset-password/[token]` — reset password (token): [reset-password token page](app/reset-password/[token]/page.js)
- `/reset-password` — legacy reset page: [reset-password page](app/reset-password/page.js)

**Dashboards**

- `/dashboard/teacher` — teacher dashboard: [teacher page](app/dashboard/teacher/page.js)
- `/dashboard/hod` — HOD dashboard: [hod page](app/dashboard/hod/page.js)
- `/dashboard/headteacher` — headteacher dashboard: [headteacher page](app/dashboard/headteacher/page.js)
- `/dashboard/student` — student dashboard: [student page](app/dashboard/student/page.js)
- `/dashboard/attendance` — attendance screen: [attendance page](app/dashboard/attendance/page.js)

**Teacher assessments**

- `/dashboard/teacher/assessments` — assessments list/manage: [assessments page](app/dashboard/teacher/assessments/page.js)
- `/dashboard/teacher/assessments/create` — redirect helper to open create modal: [create route](app/dashboard/teacher/assessments/create/page.js)

The repo includes many additional dashboard pages: results, materials, timetable, SMS, SDG, admin user management, etc.

---

## Email Password Reset (SendGrid)

### Flow

1. User requests reset via `/forgot-password`
2. Server:
   - generates random token
   - stores **SHA-256 hash** in `User.resetToken` + expiry in `User.resetTokenExpiry`
   - emails `https://{appBaseUrl}/reset-password/{token}`
3. User sets new password via `/reset-password/[token]`
4. Server validates hashed token + expiry and updates password

Email sender:

- [sendResetEmail](config/email.js)

Required env vars:

- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- optional: `NEXT_PUBLIC_APP_URL`

---

## Attendance (Real DB-backed)

The attendance UI no longer uses mock data:

- It loads students via `/api/classes/students?classId=...`
- It saves attendance via `/api/attendance` (upsert per student per date)

UI:

- [attendance page](app/dashboard/attendance/page.js)

DB model:

- [Attendance model](prisma/schema.prisma#L724-L744)

---

## UI Theme / Color Palette

### Tailwind theme tokens

The app primarily uses `royalPurple.*` tokens:

- `royalPurple.page` `#1e1033`
- `royalPurple.deep` `#170d28`
- `royalPurple.card` `#2d1f4e`
- `royalPurple.card2` `#261843`
- `royalPurple.border` `#3b2a66`
- `royalPurple.border2` `#6d28d9`
- `royalPurple.text1` `#ede9fe`
- `royalPurple.text2` `#a78bfa`
- `royalPurple.text3` `#6d28d9`
- `royalPurple.accent` `#f59e0b`
- `royalPurple.accentBg` `#2d1f0a`
- `royalPurple.accentTx` `#fcd34d`
- `royalPurple.pill` `#7c3aed`
- `royalPurple.success` `#1a2e0f` / `royalPurple.successTx` `#86efac`
- `royalPurple.danger` `#3b0a0a` / `royalPurple.dangerTx` `#fca5a5`
- `royalPurple.muted` `#4b3575`

Source:

- [tailwind.config.js](tailwind.config.js)

### CSS variables (light/dark)

The same palette is also available as CSS variables (`--rp-*`) and light mode overrides exist.

Source:

- [globals.css](app/globals.css)

---

## Offline / PWA Notes

There is a web app manifest:

- [manifest.json](public/manifest.json)

There are also offline/PWA helper utilities:

- [pwaUtils.js](lib/pwaUtils.js)
- [offlineSystem.js](lib/offlineSystem.js)

Important:

- `offlineSystem.js` references `/offline-service-worker.js`. Ensure you provide this file in `public/` if you want full offline caching behavior.

---

## Android Integration Guide

### Base URL

Use the school subdomain as the host:

- `https://{schoolSubdomain}.{rootDomain}`

Example:

- `https://ndakedaysecondaryschool.bluepeacktechnologies.com`

### Login

`POST /api/auth/login`
Body:

```json
{
  "email": "teacher@example.com",
  "password": "••••••••",
  "subdomain": "ndakedaysecondaryschool"
}
```

Response:

```json
{ "success": true, "user": { "id": "...", "role": "...", "schoolId": "...", "...": "..." } }
```

Cookies set:

- `access_token`
- `refresh_token`

### Authenticated requests

Option A (cookie):

- Use cookie jar support in your HTTP client; cookies must be sent on subsequent requests.

Option B (Bearer):

- If you extend login to return `accessToken`, you can call APIs with:
  - `Authorization: Bearer <accessToken>`

### School context requirements

If you are not using subdomains, you must provide school context:

- `x-school-id: <schoolId>` OR `x-school-subdomain: <subdomain>`

### Common mobile endpoints

- Current user: `GET /api/auth/me`
- Student dashboard: `GET /api/dashboard/student`
- Teacher dashboard: `GET /api/dashboard/teacher`
- Teaching assignments: `GET /api/teaching-assignments`
- Attendance students: `GET /api/classes/students?classId=...`
- Save attendance: `POST /api/attendance`
- Student subjects: `GET /api/student/subjects`
- Student results: `GET /api/student/results`

---

## Environment Variables

Create `.env` (and optionally `.env.local`) and set at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-too"
NEXT_PUBLIC_APP_URL="https://your-root-domain-or-school-domain"
NEXT_PUBLIC_API_URL="/api"
```

Email (password reset):

```env
SENDGRID_API_KEY="SG...."
EMAIL_FROM="no-reply@yourdomain.com"
```

Optional:

```env
NEXT_PUBLIC_APP_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_OFFLINE_MODE="false"
PORT="3000"
```

---

## Scripts & Local Development

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations (example):

```bash
npx prisma migrate dev
```

Seed:

```bash
npm run seed
npm run seed:schools
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start (production):

```bash
npm run start
```

---

## Deployment Notes

`next.config.js` sets:

- `output: 'standalone'` (recommended for Railway/containers)
- global security headers
- permissive CORS headers for `/api/*` (review before production hardening)

Source:

- [next.config.js](next.config.js)

---

## Known Constraints / TODOs

- The build currently sets `typescript.ignoreBuildErrors: true` in Next config.
- Some hooks have exhaustive-deps lint warnings; builds succeed but warnings remain.
- Offline service worker referenced by `offlineSystem.js` is not present by default.

---

## License

MIT (see [LICENSE](LICENSE))
