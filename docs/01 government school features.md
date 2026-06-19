# ZSMS — Government School Features

**Last updated:** 2026-06-12  
**Document version:** 2.1 (Phase 2 implemented)  
**Implementation phase:** Phase 2 complete

This document is the **government-school product spec** for ZSMS. It was reviewed against the live codebase (`prisma/schema.prisma`, `lib/zambiaSchoolFeatures.js`, headteacher dashboards, and API routes). Use it as the Cursor implementation prompt for **Phase 2** government-only modules.

**Companion:** [02 private school features.md](./02%20private%20school%20features.md) (fee management, parent portal — gated to `PRIVATE` ownership).

**Architecture reference:** [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) · **Operator guide:** [USER_GUIDE.md](./USER_GUIDE.md)

---

## Review summary (what changed in v2.0)

| Topic                 | Old assumption (v1.0)                                 | Correct structure (Phase 1)                                                                       |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Government detection  | `school.schoolType === 'GOVERNMENT'` or `'COMMUNITY'` | **`School.ownershipType === 'GOVERNMENT'`** (`SchoolOwnership` enum)                              |
| `schoolType` field    | Mixed with ownership                                  | **`SchoolType`**: `SCHOOL` \| `INDIVIDUAL` only (tenant/workspace type, not MoE ownership)        |
| Tenancy               | `schoolId = await resolveAuthenticatedSchoolId(...)`  | Returns **`{ ok, schoolId, response }`** — check `tenant.ok` first                                |
| Student shape         | `user.firstName`, `user.lastName`, `Student.isActive` | **`Student.name`**; optional **`User.gender`**; no `isActive` on Student                          |
| Class grade           | `Class.grade`                                         | **`Class.year_group`** + **`Class.name`** (e.g. Form 1A)                                          |
| Teacher TSC #         | New `tscNumber` only in Phase 2 model                 | **`Teacher.ts_number`** already exists; extend in Phase 2 if needed                               |
| MoE location fields   | Proposed as new                                       | **`School.province`**, **`School.district`**, **`School.reportingStreamKey`** already on `School` |
| Fee features          | Not mentioned                                         | **`fee-management`** blocked for `GOVERNMENT` via `lib/school/feeManagementAccess.js`             |
| EMIS / grants / leave | Written as if greenfield                              | **Phase 2 implemented** — see `/api/government/*` and `/dashboard/headteacher/government/*`       |
| Backend stack         | “Node.js/Express”                                     | **Next.js 16 App Router** API routes only (`app/api/`)                                            |

---

## Phase 1 — Structural foundation (implemented)

These changes are **live** and apply to both government and private schools unless ownership-gated.

### 1. School ownership model

```prisma
enum SchoolOwnership {
  PRIVATE    // default — fee management, invoicing (Phase 2 private doc)
  GOVERNMENT // MoE / grant-aided public schools — no school fee collection in ZSMS
}

model School {
  schoolType    SchoolType      @default(SCHOOL)   // SCHOOL | INDIVIDUAL (solo teacher workspace)
  ownershipType SchoolOwnership @default(PRIVATE)  // PRIVATE | GOVERNMENT
  province      String?
  district      String?
  reportingStreamKey String?
  eczCentreNumber    String?
  // ...
}
```

**Set at onboarding or by platform admin.** Default for new schools: `ownershipType = PRIVATE`.

### 2. Government detection (use everywhere)

```js
import { getSchoolOwnershipType, isGovernmentSchool } from '@/lib/school/feeManagementAccess'

const ownershipType = await getSchoolOwnershipType(schoolId)
if (isGovernmentSchool(ownershipType)) {
  // government-only UI or API
}
```

**Do not** use `schoolType` for government vs private. **`SchoolType.INDIVIDUAL`** is the solo-teacher portal, not a MoE category.

### 3. Feature gating layers

| Layer          | Helper                                                                          | Purpose                                         |
| -------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| Plan / trial   | `requireFeature(schoolId, 'feature-id')` in `lib/middleware/planGate-zambia.js` | Subscription plan                               |
| School level   | `canUseFeature(level, featureId)` in `lib/zambiaSchoolFeatures.js`              | Primary vs secondary (e.g. hide HOD on primary) |
| Ownership      | `canUseFeatureForOwnership(ownershipType, featureId)`                           | **`fee-management`** → private only             |
| Workspace type | `requireSchoolType(schoolId, ['SCHOOL'])`                                       | Block individual workspaces from school APIs    |

Ownership-gated features (`OWNERSHIP_GATED_FEATURES`):

```js
'fee-management': {
  label: 'Fee management',
  description: 'Student invoicing, payment tracking, receipts',
  availableFor: ['private'],
}
```

Government schools receive **403** on `POST /api/payments/mobile-money` and any route using `assertFeeManagementAllowed(schoolId)`.

### 4. Tenancy pattern (required for all API routes)

```js
const auth = await authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
if (!tenant.ok) return tenant.response
const schoolId = tenant.schoolId
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
```

Never read `schoolId` from the request body for authorization.

### 5. Shared stack conventions

- **Framework:** Next.js 16 App Router, React 19, Tailwind (`royalPurple-*` theme)
- **Database:** PostgreSQL (Neon) via Prisma 6 — `getTenantClient(schoolId)` or `prisma` with `schoolId` in `where`
- **Auth:** JWT httpOnly cookies — `authMiddleware(request)`, `roleCheck(auth.user, [...])`
- **Errors:** `withErrorHandler` / `ApiError` from `lib/middleware/errorHandler`
- **SMS:** `lib/sms/` — Africa's Talking (`sendAfricasTalkingSms`, `buildTermResultsCompleteSmsMessage`)
- **Email:** Resend via `config/email.js`
- **Security:** Edge `proxy.js` — CSRF, rate limits, anti-scraping (`lib/security/antiScraping.js`)

---

## Already available to government schools (no Phase 2 required)

These headteacher / school features work today when the school plan includes them. They are **not** hidden behind `ownershipType` unless noted.

| Feature                           | Route / API                                                                      | Notes                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| MOE Reports (enrollment snapshot) | `/dashboard/headteacher/moe-reports` · `GET /api/dashboard/moe-reports`          | CSV export; uses `getMoeReportSnapshot` — **not** full HDCT/EMIS workbook yet |
| STEM Monitoring                   | `/dashboard/headteacher/stem-monitoring` · `GET /api/dashboard/stem-performance` | Plan feature `stem-monitoring`                                                |
| ECZ Exam Tracking                 | `/dashboard/headteacher/exam-tracking`                                           | Secondary / combined                                                          |
| Attendance + returns              | `/dashboard/attendance/returns` · `app/api/attendance/*`                         | Monthly returns CSV                                                           |
| Results + parent SMS              | `POST /api/teacher/results` → `lib/results/checkAndNotifyParent.js`              | SMS when all enrolled subjects finalized; uses guardian contacts on `Student` |
| Timetable                         | `/dashboard/headteacher/timetable`                                               | Hybrid generate pipeline                                                      |
| Transport lists (minimal)         | `/dashboard/headteacher/transport` · `/api/transport/*`                          | Bus routes — useful for grant-aided boarding                                  |
| Hostel / boarding lists           | `/dashboard/headteacher/hostel` · `/api/hostel/*`                                | Room assignment by year                                                       |
| CBC Assessment                    | `/dashboard/teacher/assessments/cbc`                                             | Primary schools                                                               |
| Assessments overview              | `/dashboard/assessments`                                                         | Headteacher teacher performance %                                             |

**Blocked for government schools:** Payments / school fee collection (`/dashboard/payments`, `fee-management`).

**Future enum extension (Phase 3+):** `GRANT_AIDED`, `COMMUNITY` — not in schema yet; treat as `GOVERNMENT` for gating until added.

---

## Phase 2 — Government-only modules (implemented)

Routes live under `app/api/government/*` and `app/dashboard/headteacher/government/*`. APIs use `authorizeGovernmentRoute()` in `lib/government/routeAuth.js` (auth → tenancy → plan → `requireSchoolTypeAccess`).

Plan feature ids in `lib/zambiaSchoolFeatures.js`: `emis-export`, `grants-tracking`, `gender-report`, `teacher-leave`, `teacher-deployment`.

---

### FEATURE 2.1 — EMIS / MoE HDCT export (extends MOE Reports)

**Status:** Implemented (Phase 2)  
**Relation to today:** `/api/dashboard/moe-reports` provides enrollment CSV; Phase 2 adds **multi-sheet Excel** aligned to Harmonised Data Collection Tool (HDCT).

**Prisma:** No new models required for v1 export. Optional Phase 2 field on `School`:

```prisma
// Add when MoE EMIT validation is required:
emitNumber String?  // MoE school EMIT registration number
zone       String?  // education zone (if not covered by reportingStreamKey)
```

**Data sources (actual model names):**

| HDCT sheet                | ZSMS source                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------ |
| School profile            | `School` (name, province, district, level, ownershipType, eczCentreNumber)           |
| Enrolment by grade/gender | `Student` + `User.gender` + `Class.year_group`                                       |
| Teaching staff            | `Teacher` + `User` (`name`, `gender`, `Teacher.qualifications`, `Teacher.ts_number`) |
| Attendance                | `AttendanceMark` joined to `Student` / `Class`                                       |

**API:** `app/api/government/emis-export/route.js` — `GET ?year=YYYY` → `.xlsx` (use `xlsx` package).

**UI:** `app/dashboard/headteacher/government/emis-export/page.js`

**Note:** Sample SQL in v1.0 used `Student.isActive`, `Class.grade`, and `User.firstName` — **replace** with live fields above.

```bash
npm install xlsx
```

---

### FEATURE 2.2 — School grants tracking

**Status:** Implemented (Phase 2)

Capitation and infrastructure grants from MoE — receipt, allocation by budget line, expenditure for DEO audit.

**Prisma additions:**

```prisma
model SchoolGrant {
  id             String   @id @default(cuid())
  schoolId       String
  school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  grantType      String   // "capitation" | "infrastructure" | "special"
  amountReceived Float
  receivedDate   DateTime
  academicYear   Int
  term           Int      // 1 | 2 | 3
  pupilCount     Int
  notes          String?
  allocations    GrantAllocation[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([schoolId, academicYear])
}

model GrantAllocation {
  id        String      @id @default(cuid())
  grantId   String
  grant     SchoolGrant @relation(fields: [grantId], references: [id], onDelete: Cascade)
  schoolId  String
  lineItem  String      // "textbooks" | "chalk" | "maintenance" | "sports" | "other"
  budgeted  Float
  spent     Float       @default(0)
  receipts  String[]    @default([])
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([schoolId])
  @@index([grantId])
}
```

**APIs:**

- `app/api/government/grants/route.js` — GET list, POST create
- `app/api/government/grants/[id]/allocations/route.js` — GET/POST allocations
- `app/api/government/grants/[id]/allocations/[allocId]/route.js` — PATCH spent
- `app/api/government/grants/summary/route.js` — year summary

**UI:** `app/dashboard/headteacher/government/grants/page.js`

---

### FEATURE 2.3 — Gender parity & dropout reporting (SDG 4)

**Status:** Implemented (Phase 2)  
**Overlap:** Plan includes `girls-dropout-tracking` feature flag — wire UI here.

Enrolment, attendance, and withdrawals disaggregated by gender; Gender Parity Index (GPI).

**Prisma:** Uses existing `Student`, `User.gender`, `Class`, `AttendanceMark`. Dropout logic must be defined (e.g. `Student` status field or withdrawal workflow — **not** `isActive` today).

**API:** `app/api/government/gender-report/route.js` — `GET ?year=YYYY`

**UI:** `app/dashboard/headteacher/government/gender-report/page.js` — GPI card, enrolment chart, dropout table, export PDF/CSV.

---

### FEATURE 2.4 — Teacher deployment & leave records

**Status:** Implemented (Phase 2)  
**Overlap:** `teacher-deployment-system` exists in `ZAMBIA_FEATURES` metadata only — no `TeacherDeployment` model yet.

**Prisma additions:**

```prisma
model TeacherLeave {
  id         String   @id @default(cuid())
  schoolId   String
  school     School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  teacherId  String
  teacher    Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  leaveType  String   // "annual" | "sick" | "maternity" | "paternity" | "compassionate" | "study"
  startDate  DateTime
  endDate    DateTime
  daysCount  Int
  reason     String?
  approvedBy String?
  status     String   @default("pending") // "pending" | "approved" | "rejected"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([schoolId, teacherId])
  @@index([schoolId, startDate])
}

model TeacherDeployment {
  id             String    @id @default(cuid())
  schoolId       String
  school         School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  teacherId      String    @unique
  teacher        Teacher   @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  deployedFrom   String?
  deploymentDate DateTime?
  tscNumber      String?   // or sync from Teacher.ts_number
  gradeLevel     String?   // e.g. "Scale D1"
  qualification  String?
  subjectSpec    String[]  @default([])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([schoolId])
}
```

**Leave balances (Zambia government norms):** annual 30 days, sick 90 days — sum approved leave in current calendar year.

**APIs:**

- `app/api/government/leave/route.js` — GET (with balances), POST
- `app/api/government/leave/[id]/route.js` — PATCH approve/reject (headteacher)
- `app/api/government/deployment/route.js` — GET, POST, PATCH

**UI:**

- `app/dashboard/headteacher/government/leave/page.js` — leave register, balances, apply/approve
- `app/dashboard/headteacher/government/deployment/page.js` — teacher deployment register

**SMS:** On leave approval, optional hook via `lib/sms/sendAfricasTalkingSms` (not wired in v1).

---

## Phase 2 — Navigation (implemented)

Headteacher sidebar (`components/dashboard/Sidebar.js`) injects five links after **MOE Reports** when `getSchoolFeatures(school).isGovernment` is true:

| Link             | Path                                              |
| ---------------- | ------------------------------------------------- |
| EMIS Export      | `/dashboard/headteacher/government/emis-export`   |
| Grants Tracking  | `/dashboard/headteacher/government/grants`        |
| Gender & Dropout | `/dashboard/headteacher/government/gender-report` |
| Staff Leave      | `/dashboard/headteacher/government/leave`         |
| Deployments      | `/dashboard/headteacher/government/deployment`    |

Keep existing **MOE Reports** for all schools on standard+ plans; EMIS export is the government HDCT superset.

---

## Phase 2 — Migration (shipped)

```bash
npx prisma migrate deploy   # includes 20260620120000_government_school_features
npm install xlsx
```

Models: `SchoolGrant`, `GrantAllocation`, `TeacherLeave`, `TeacherDeployment`.

---

## Implementation checklist (Phase 2 — complete)

| Step | Item                                                       | Status |
| ---- | ---------------------------------------------------------- | ------ |
| 1    | Helpers + `schoolTypeGate` + plan feature ids              | Done   |
| 2    | Prisma models + migration + `xlsx`                         | Done   |
| 3    | `lib/government/*` services                                | Done   |
| 4    | `/api/government/*` routes                                 | Done   |
| 5    | Sidebar + five headteacher UI pages (`sessionFetch`)       | Done   |
| 6    | Unit tests + `SYSTEM_DOCUMENTATION.md` + `docs:api-routes` | Done   |

---

## Related documentation

| Document                                                                           | Use                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [02 private school features.md](./02%20private%20school%20features.md)             | Private-only fees, invoices, parent portal (Phase 2 private) |
| [04 attendance parent sms](./04%20attendance%20parent%20sms.md)                    | Real-time attendance SMS spec                                |
| [03 timetable conflict resolution.md](./03%20timetable%20conflict%20resolution.md) | Timetable pipeline                                           |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)                               | Architecture, security, data model                           |
| [API_ROUTES.md](./API_ROUTES.md)                                                   | Auto-generated route list                                    |

---

_Phase 2 government modules (EMIS export, grants, gender report, leave, deployments) are implemented._
