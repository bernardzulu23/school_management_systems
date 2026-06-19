# ZSMS — Private School Features

**Last updated:** 2026-06-12  
**Document version:** 2.1 (Phase 2 fee management shipped)  
**Implementation phase:** Phase 1 complete · **Phase 2 core complete** (invoicing, parent portal, proprietor overview, overdue cron)

This document is the **private-school product spec** for ZSMS. It was reviewed against the live codebase (`prisma/schema.prisma`, `lib/fees/*`, `lib/school/feeManagementAccess.js`, payments APIs, parent SMS, and student AI features). Phase 2 fee invoicing is implemented; remaining follow-ups (payment plans, USSD fee balance, public events) are listed below.

**Companion:** [01 government school features.md](./01%20government%20school%20features.md) (MoE reporting, grants, government staff — gated to `GOVERNMENT` ownership).

**Related specs:** [04 attendance parent sms](./04%20attendance%20parent%20sms.md) · [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) · [USER_GUIDE.md](./USER_GUIDE.md)

---

## Review summary (what changed in v2.0)

| Topic                       | Old assumption (v1.0)                                | Correct structure (Phase 1)                                                                                            |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Private vs government       | `school.schoolType !== 'GOVERNMENT'`                 | **`School.ownershipType === 'PRIVATE'`** (`SchoolOwnership` enum)                                                      |
| `schoolType` field          | Used for fee gating                                  | **`SchoolType`**: `SCHOOL` \| `INDIVIDUAL` only — workspace type, not fee policy                                       |
| Tenancy                     | `schoolId = await resolveAuthenticatedSchoolId(...)` | Returns **`{ ok, schoolId, response }`** — check `tenant.ok` first                                                     |
| Parent phone                | `User.parentPhone`, `user.parentName`                | **`Student.guardian_contact`**, **`parent_father_contact`**, **`parent_mother_contact`** (+ names/emails on `Student`) |
| Student display name        | `user.firstName` + `user.lastName`                   | **`Student.name`** (optional linked `User.name`)                                                                       |
| Class                       | `Class.grade`                                        | **`Class.year_group`** + **`Class.name`**                                                                              |
| Active students             | `Student.isActive`                                   | **No `isActive` field** — use enrolment/class membership                                                               |
| Results for parents         | `termReport` with `subject` relation                 | **`Result`** model for marks; **`TermReport`** is AI narrative report (different shape)                                |
| Results SMS                 | New `lib/results/parentNotifications.js`             | **Implemented:** `lib/results/checkAndNotifyParent.js` wired from `POST /api/teacher/results`                          |
| Attendance SMS              | New `lib/attendance/parentNotifications.js`          | **Implemented:** `lib/attendance/attendanceSms.js` (`sendAttendanceStatusSmsBatch`)                                    |
| Study assistant             | `app/api/student/study-assistant` + raw Groq         | **Implemented:** `POST /api/ai/study-assistant` + RAG via `lib/ai/rag-context.js`                                      |
| USSD                        | Greenfield handler in route                          | **Partial:** `lib/ussd/parent-portal.js` — attendance + results + contact; **no fee balance yet**                      |
| School fees vs SaaS billing | Conflated                                            | **`/dashboard/billing`** = ZSMS subscription; **`/dashboard/payments`** = school fee mobile money (private only)       |
| Fee models                  | Written as if missing                                | **`FeeSchedule` / `StudentInvoice` / `FeePayment` not in schema yet** — Phase 2                                        |
| Backend stack               | “Node.js/Express”                                    | **Next.js 16 App Router** API routes only                                                                              |
| Events                      | New `SchoolEvent` model only                         | **`Activity` model exists** (`app/api/activities/`) — Phase 2 may extend or add public calendar                        |

---

## Phase 1 — Structural foundation (implemented)

Shared with government schools unless ownership-gated below.

### 1. School ownership model

```prisma
enum SchoolOwnership {
  PRIVATE    // default — school fee collection allowed (Phase 2 invoicing)
  GOVERNMENT // no school fee modules in ZSMS
}

model School {
  schoolType    SchoolType      @default(SCHOOL)   // SCHOOL | INDIVIDUAL
  ownershipType SchoolOwnership @default(PRIVATE)
  // ...
}
```

### 2. Private school detection (use for all fee features)

```js
import { getSchoolOwnershipType, isGovernmentSchool } from '@/lib/school/feeManagementAccess'
import { canUseFeatureForOwnership } from '@/lib/zambiaSchoolFeatures'

const ownershipType = await getSchoolOwnershipType(schoolId)

// Option A — explicit
if (!isGovernmentSchool(ownershipType)) {
  // private-only fee UI / APIs
}

// Option B — feature gate (preferred in routes)
const allowed = canUseFeatureForOwnership(ownershipType, 'fee-management')
if (!allowed) {
  return NextResponse.json(
    { error: 'Fee management is not available for government schools' },
    { status: 403 }
  )
}
```

**Do not** compare `schoolType` to `'GOVERNMENT'`. **`SchoolType.INDIVIDUAL`** is the solo-teacher workspace (`/dashboard/solo`), not a private secondary school.

### 3. Feature gating layers

| Layer       | Helper                                                                        | Private-school notes                                                                                 |
| ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ownership   | `canUseFeatureForOwnership(ownershipType, 'fee-management')`                  | **Private only**; aliases `school-fees-management`                                                   |
| Plan        | `requireFeature(schoolId, 'fee-management')`                                  | Standard+ plans include `school-fees-management` / `fee-management` in `lib/zambiaSchoolFeatures.js` |
| Enforcement | `assertFeeManagementAllowed(schoolId)` in `lib/school/feeManagementAccess.js` | Used on `POST /api/payments/mobile-money`                                                            |

### 4. Tenancy pattern (required)

```js
const auth = await authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
if (!tenant.ok) return tenant.response
const schoolId = tenant.schoolId
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
```

### 5. Parent / guardian contact fields (actual schema)

On **`Student`** (not `User`):

| Field                                                          | Purpose                      |
| -------------------------------------------------------------- | ---------------------------- |
| `guardian_contact`                                             | Primary guardian phone (SMS) |
| `parent_father_contact`                                        | Father phone                 |
| `parent_mother_contact`                                        | Mother phone                 |
| `guardian_name`, `parent_father_name`, `parent_mother_name`    | Personalisation              |
| `guardian_email`, `parent_father_email`, `parent_mother_email` | Email (optional)             |

Use `extractParentContacts()` from `lib/results/checkAndNotifyParent.js` or the same pattern in attendance SMS.

### 6. Stack conventions

- **Framework:** Next.js 16 App Router, React 19, Tailwind (`royalPurple-*`)
- **DB:** Prisma 6 + `getTenantClient(schoolId)` where applicable
- **School fee payments (Phase 1 partial):** Lipila mobile money — `app/api/payments/mobile-money/route.js`, UI `/dashboard/payments`
- **SaaS billing (all schools):** `app/api/billing/subscription-payment`, UI `/dashboard/billing`
- **SMS:** `lib/sms/` — `sendAfricasTalkingSms`, `buildAttendanceSmsMessage`, `buildTermResultsCompleteSmsMessage`
- **Mobile money lib:** `lib/payments/lipila.js` (collections callback `app/api/payments/lipila/callback`)

---

## Already available to private schools (Phase 1 — no Phase 2 required)

| Feature                             | Route / API                                                           | Notes                                                           |
| ----------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Mobile money payment (basic)        | `/dashboard/payments` · `POST /api/payments/mobile-money`             | Lipila STK-style collection; **not** full invoicing yet         |
| ZSMS subscription billing           | `/dashboard/billing`                                                  | All school types — platform SaaS fee                            |
| Results parent SMS                  | `lib/results/checkAndNotifyParent.js`                                 | When all enrolled subjects finalized (`ResultsStatus` tracking) |
| Attendance parent SMS               | `lib/attendance/attendanceSms.js`                                     | On present/absent/late; **standard/premium** plan               |
| Chronic absence SMS                 | `lib/attendance/sessions.js`                                          | Batch parent + teacher notifications                            |
| AI study assistant                  | `/dashboard/student/study-assistant` · `POST /api/ai/study-assistant` | RAG from `SchoolMaterial` chunks — **all school types**         |
| USSD parent menu (partial)          | `POST /api/ussd` · `lib/ussd/parent-portal.js`                        | Attendance, latest result, school contact                       |
| Transport & hostel lists            | `/dashboard/headteacher/transport`, `/hostel`                         | Useful for private boarding schools                             |
| Extracurricular activities          | `app/api/activities/` · `Activity` model                              | Internal school events — not public `/events` page yet          |
| MOE / ECZ / timetable / assessments | Shared headteacher tools                                              | Same as government doc “already available” table                |

**Blocked for government schools only:** `fee-management` routes and `/dashboard/payments` school-fee collection.

---

## Phase 2 — Private-school modules (core implemented)

Gate every route under `app/api/fees/*` and private fee dashboards with **ownership + plan** (via `lib/fees/routeAuth.js`):

```js
const ownershipBlock = await assertFeeManagementAllowed(schoolId)
if (ownershipBlock) return ownershipBlock

const featureBlock = await requireFeature(schoolId, 'fee-management')
if (featureBlock) return featureBlock
```

**Migration:** `prisma/migrations/20260622120000_add_private_school_fee_features/`

**Payment split (important):** Manual invoice payments use model **`FeePayment`** (`/api/fees/payments`). Lipila mobile-money attempts remain on **`SchoolFeePayment`** (`/api/payments/mobile-money`) — not auto-allocated to invoices in v1.

---

### FEATURE 2.1 — Parent portal with fee statements

**Status:** ✅ Implemented (Phase 2)

Parents use **student login credentials** (no separate parent account) to view read-only: fee balance, payment history, attendance summary, latest results.

**Approach:** `?mode=parent` on student dashboard or dedicated `/dashboard/student/parent-view` that hides student-only tools.

**Prisma additions:**

```prisma
model FeeSchedule {
  id           String           @id @default(cuid())
  schoolId     String
  school       School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name         String
  amount       Float
  dueDate      DateTime
  term         Int
  academicYear Int
  gradeLevel   String?
  feeType      String           @default("tuition") // tuition | boarding | transport | exam | other
  isActive     Boolean          @default(true)
  invoices     StudentInvoice[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([schoolId, academicYear, term])
}

model StudentInvoice {
  id           String        @id @default(cuid())
  schoolId     String
  school       School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  studentId    String
  student      Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  scheduleId   String
  schedule     FeeSchedule   @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  amountDue    Float
  discount     Float         @default(0)
  discountType String?
  netAmount    Float
  amountPaid   Float         @default(0)
  balance      Float
  status       String        @default("unpaid") // unpaid | partial | paid | overdue
  dueDate      DateTime
  payments     FeePayment[]
  paymentPlan  PaymentPlan?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([schoolId, studentId])
  @@index([schoolId, status])
}

model FeePayment {
  id          String         @id @default(cuid())
  schoolId    String
  invoiceId   String
  invoice     StudentInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  amount      Float
  paymentDate DateTime       @default(now())
  method      String         // cash | mtn_mobile_money | airtel_money | zamtel_kwacha | bank_transfer | lipila
  reference   String?
  recordedBy  String
  notes       String?
  createdAt   DateTime       @default(now())

  @@index([schoolId])
  @@index([invoiceId])
}
```

**APIs (shipped):**

| Route                                     | Purpose                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `app/api/fees/schedules/route.js`         | GET/POST fee schedules                               |
| `app/api/fees/invoices/route.js`          | List invoices (filters: student, status, term, year) |
| `app/api/fees/invoices/generate/route.js` | Bulk generate from schedule (idempotent per student) |
| `app/api/fees/payments/route.js`          | GET ledger / POST manual payment against invoice     |
| `app/api/fees/summary/route.js`           | School-wide billed / collected / outstanding         |
| `app/api/fees/siblings/route.js`          | GET/POST sibling groups (min 2 students)             |
| `app/api/parent/portal/route.js`          | Parent view for logged-in student user               |
| `app/api/proprietor/overview/route.js`    | Headteacher/ADMIN KPI overview                       |
| `app/api/cron/fee-overdue-check/route.js` | Weekly overdue mark + parent SMS (`CRON_SECRET`)     |

**Parent portal query pattern (corrected):**

```js
const student = await prisma.student.findFirst({
  where: { userId: auth.user.id, schoolId },
  select: {
    id: true,
    name: true,
    class: true,
    classId: true,
    guardian_name: true,
    guardian_contact: true,
    parent_father_contact: true,
    parent_mother_contact: true,
    // StudentInvoice: { include: { schedule: true, payments: true } } — after Phase 2 migration
  },
})
```

Attendance summary: use `Attendance` or `AttendanceMark` (match existing attendance module — see [04 attendance parent sms](./04%20attendance%20parent%20sms.md)).

Latest results: use `Result` filtered by `studentId`, `term`, `year`, with `subject` relation — not `TermReport` unless showing narrative reports.

**UI:** `app/dashboard/student/parent-view/page.js`

---

### FEATURE 2.2 — Sibling discounts & payment plans

**Status:** Sibling groups ✅ implemented · Payment plans **planned** (v2)

```prisma
model SiblingGroup {
  id        String    @id @default(cuid())
  schoolId  String
  school    School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  discount  Float     @default(0.1)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  members   SiblingGroupMember[]

  @@index([schoolId])
}

model SiblingGroupMember {
  id             String       @id @default(cuid())
  siblingGroupId String
  siblingGroup   SiblingGroup @relation(fields: [siblingGroupId], references: [id], onDelete: Cascade)
  studentId      String
  student        Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  schoolId       String

  @@unique([siblingGroupId, studentId])
  @@index([schoolId])
}

model PaymentPlan {
  id          String         @id @default(cuid())
  schoolId    String
  invoiceId   String         @unique
  invoice     StudentInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  instalments Int
  schedule    Json           // [{ dueDate, amount, paid }]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}
```

**Note:** v1.0 used `students Student[]` on `SiblingGroup` — use explicit join table for Prisma many-to-many clarity.

**APIs:** `app/api/fees/siblings/route.js` (shipped) · `app/api/fees/payment-plans/route.js` (not yet)

**UI:** `/dashboard/headteacher/fees/siblings` (shipped) · payment plan modal on invoices (future)

---

### FEATURE 2.3 — Automated parent communication triggers

**Status:** Partially implemented — extend in Phase 2

| Trigger                            | Status      | Implementation                                                               |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| Attendance absent/late/present SMS | **Done**    | `lib/attendance/attendanceSms.js` — plan-gated                               |
| Results all subjects entered       | **Done**    | `lib/results/checkAndNotifyParent.js`                                        |
| Fee overdue reminder               | **Done**    | `lib/fees/overdueCron.js`, `GET /api/cron/fee-overdue-check` (Mon 07:00 UTC) |
| Low attendance warning (&lt;80%)   | **Planned** | Extend `lib/attendance/sessions.js` or dedicated job                         |

**Fee overdue (shipped):**

- `lib/fees/overdueCron.js` — batch overdue invoices, update status, SMS parents
- Cron: `app/api/cron/fee-overdue-check/route.js` in `vercel.json` (`0 7 * * 1`)
- Parent phone from **`Student`** guardian fields via `pickParentPhone()` in `lib/fees/helpers.js`
- SMS via `sendAfricasTalkingSms` from `lib/sms.js`

**Do not duplicate** results SMS in a new `parentNotifications.js` — call `checkAndNotifyParent()` from results routes only.

---

### FEATURE 2.4 — School proprietor dashboard

**Status:** ✅ Implemented (v1 — headteacher/ADMIN; no separate `proprietor` role yet)

Read-only financial + enrolment overview for school owners.

- **API:** `app/api/proprietor/overview/route.js` — `StudentInvoice` + `FeePayment` aggregates
- **UI:** `app/dashboard/proprietor/page.js` — KPIs, monthly collections chart, top outstanding
- **Access:** `headteacher` or `ADMIN` + `requireSchoolTypeAccess(schoolId, 'proprietor-dashboard')`
- Sidebar link **Owner Dashboard** when `features.proprietorDashboard`
- **No** access to SBA, timetable edit, or full student PII export

Future: dedicated **`proprietor`** user role seeding.

---

### FEATURE 2.5 — Public school events calendar

**Status:** Planned (Phase 2) — **overlap with `Activity`**

Existing: `Activity` + `app/api/activities/` for in-school extracurricular events.

Phase 2 options:

1. **Extend `Activity`** with `isPublic`, `eventType`, `endDate` and add public `GET /api/events` resolved by `x-school-subdomain`, or
2. Add **`SchoolEvent`** as in v1.0 spec for ECZ exam dates / holidays.

**Public page:** `app/events/page.js` (no auth; subdomain from proxy `x-school-subdomain`)

**Admin UI:** `app/dashboard/headteacher/events/page.js` — calendar + share link

---

### FEATURE 2.6 — USSD fee balance (extend existing)

**Status:** Partial → Phase 2 extension

**Today:** `lib/ussd/parent-portal.js` menu:

1. Check child attendance
2. Latest result
3. School contact

**Phase 2:** Add option **2 → Fee balance** (renumber menu) after `StudentInvoice` exists:

- Match parent by `guardian_contact` / father / mother phone (last 9 digits — existing pattern)
- Sum `StudentInvoice.balance` where status in `unpaid`, `partial`, `overdue`

See [USSD_GUIDE.md](./USSD_GUIDE.md) for Africa's Talking callback configuration.

---

### FEATURE 2.7 — AI study assistant

**Status:** ✅ Implemented (all school types — not private-only)

| Item   | Path                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| API    | `POST /api/ai/study-assistant`                                                |
| UI     | `/dashboard/student/study-assistant` · `components/student/StudyAssistant.js` |
| RAG    | `lib/ai/rag-context.js` → `SchoolMaterial` / `MaterialChunk`                  |
| Limits | `withAILimits` + `trackAIUsage`                                               |

No Phase 2 work unless enhancing (subject filter, conversation history, ECZ exam mode). **Remove from private Phase 2 checklist** unless product asks for upgrades.

---

## Phase 2 — Navigation (shipped)

Fee links in `components/dashboard/Sidebar.js` when `features.feeManagement` (private/grant-aided):

- `/dashboard/headteacher/fees/schedules` — Fee Schedules
- `/dashboard/headteacher/fees/invoices` — Invoices
- `/dashboard/headteacher/fees/siblings` — Sibling Groups
- `/dashboard/proprietor` — Owner Dashboard (when `features.proprietorDashboard` + headteacher)
- `/dashboard/student/parent-view` — Parent view (student nav)

Keep existing **`/dashboard/payments`** (Lipila) — separate from manual invoice payments.

---

## Billing vs school fees (important distinction)

| Concept                         | Who pays          | UI                                                                                                | API                                                                    |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **ZSMS subscription**           | School → Bluepeak | `/dashboard/billing`                                                                              | `app/api/billing/*`                                                    |
| **School fees (tuition, etc.)** | Parent → School   | `/dashboard/payments` (Lipila), `/dashboard/headteacher/fees/*`, `/dashboard/student/parent-view` | `app/api/payments/mobile-money` (Lipila), `app/api/fees/*` (invoicing) |

Government schools: **school fees blocked**; **billing** for ZSMS plan still applies.

---

## Phase 2 — Migration

```bash
npx prisma migrate deploy   # production
# or locally:
npx prisma migrate dev
npx prisma generate
```

Applied migration: `prisma/migrations/20260622120000_add_private_school_fee_features/`.

Optional dependency for exports/receipts:

```bash
npm install xlsx   # if PDF/Excel fee statements needed
```

---

## Implementation checklist (Phase 2 order)

| Step | Item                                                                  | Status         |
| ---- | --------------------------------------------------------------------- | -------------- |
| 1    | Expose `ownershipType` on `GET /api/school/current` + SchoolContext   | ✅             |
| 2    | Prisma: `FeeSchedule`, `StudentInvoice`, `FeePayment`, `SiblingGroup` | ✅             |
| 3    | Fee schedules + invoice generation APIs                               | ✅             |
| 4    | Record manual payments (`FeePayment`) — Lipila auto-link **deferred** | ✅ manual only |
| 5    | Parent portal API + `/dashboard/student/parent-view`                  | ✅             |
| 6    | Sibling groups (payment plans deferred)                               | ✅ partial     |
| 7    | Fee overdue cron + SMS                                                | ✅             |
| 8    | Proprietor overview dashboard (headteacher/ADMIN v1)                  | ✅             |
| 9    | USSD fee balance menu item                                            | Planned        |
| 10   | Public events calendar (extend `Activity` or `SchoolEvent`)           | Planned        |
| 11   | `SYSTEM_DOCUMENTATION.md` + `npm run docs:api-routes` + unit tests    | ✅             |

---

## Related documentation

| Document                                                                           | Use                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| [01 government school features.md](./01%20government%20school%20features.md)       | Government Phase 2 (EMIS, grants, leave) |
| [04 attendance parent sms](./04%20attendance%20parent%20sms.md)                    | Attendance SMS wiring spec               |
| [03 timetable conflict resolution.md](./03%20timetable%20conflict%20resolution.md) | Timetable pipeline                       |
| [USSD_GUIDE.md](./USSD_GUIDE.md)                                                   | Africa's Talking USSD setup              |
| [SMS_GUIDE.md](./SMS_GUIDE.md)                                                     | SMS broadcasts and templates             |
| [API_ROUTES.md](./API_ROUTES.md)                                                   | Auto-generated route list                |

---

_Phase 2 core fee management (schedules, invoices, manual payments, sibling discounts, parent portal, proprietor overview, overdue cron) is complete. Follow-ups: Lipila→invoice allocation, payment plans, USSD fee balance, public events calendar._
