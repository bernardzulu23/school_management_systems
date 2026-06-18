# ZSMS — Private School Features

**Last updated:** 2026-06-12  
**Document version:** 2.0 (structural alignment)  
**Implementation phase:** Phase 1 complete → Phase 2 next

This document is the **private-school product spec** for ZSMS. It was reviewed against the live codebase (`prisma/schema.prisma`, `lib/zambiaSchoolFeatures.js`, `lib/school/feeManagementAccess.js`, payments APIs, parent SMS, and student AI features). Use it as the Cursor implementation prompt for **Phase 2** private-school fee and proprietor modules.

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

## Phase 2 — Private-school modules (planned)

Gate every route under `app/api/fees/*` and private fee dashboards with **ownership + plan**:

```js
const ownershipBlock = await assertFeeManagementAllowed(schoolId)
if (ownershipBlock) return ownershipBlock

const featureBlock = await requireFeature(schoolId, 'fee-management')
if (featureBlock) return featureBlock
```

---

### FEATURE 2.1 — Parent portal with fee statements

**Status:** Planned (Phase 2)

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

**APIs:**

| Route                                     | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `app/api/fees/schedules/route.js`         | GET/POST fee schedules                              |
| `app/api/fees/schedules/[id]/route.js`    | GET/PATCH/DELETE                                    |
| `app/api/fees/invoices/route.js`          | List invoices                                       |
| `app/api/fees/invoices/generate/route.js` | Bulk generate from schedule                         |
| `app/api/fees/invoices/[id]/route.js`     | Invoice + payment history                           |
| `app/api/fees/payments/route.js`          | Record payment (link to Lipila ref when applicable) |
| `app/api/fees/summary/route.js`           | School-wide billed / collected / outstanding        |
| `app/api/parent/portal/route.js`          | Parent view for logged-in student user              |

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

**Status:** Planned (Phase 2)

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

**APIs:** `app/api/fees/siblings/route.js`, `app/api/fees/payment-plans/route.js`

**UI:** Sibling group modal + payment plan on invoice management pages under `/dashboard/headteacher/fees/*`

---

### FEATURE 2.3 — Automated parent communication triggers

**Status:** Partially implemented — extend in Phase 2

| Trigger                            | Status      | Implementation                                       |
| ---------------------------------- | ----------- | ---------------------------------------------------- |
| Attendance absent/late/present SMS | **Done**    | `lib/attendance/attendanceSms.js` — plan-gated       |
| Results all subjects entered       | **Done**    | `lib/results/checkAndNotifyParent.js`                |
| Fee overdue reminder               | **Planned** | Requires `StudentInvoice` + cron                     |
| Low attendance warning (&lt;80%)   | **Planned** | Extend `lib/attendance/sessions.js` or dedicated job |

**Fee overdue (Phase 2):**

- `lib/fees/overdueNotifications.js` — query `StudentInvoice` where `dueDate < now` and status unpaid/partial
- Cron: `app/api/cron/fee-overdue-check/route.js` (add to `vercel.json` — pattern exists for `ecz-reminder`, `sms-low-balance`)
- Parent phone from **`Student`** guardian fields, not `User.parentPhone`
- SMS via `sendAfricasTalkingSms` from `lib/sms.js`

**Do not duplicate** results SMS in a new `parentNotifications.js` — call `checkAndNotifyParent()` from results routes only.

---

### FEATURE 2.4 — School proprietor dashboard

**Status:** Planned (Phase 2)

Read-only financial + enrolment overview for school owners who are not headteachers.

- New role **`proprietor`** in auth + `Sidebar.js` routing to `/dashboard/proprietor`
- **API:** `app/api/proprietor/overview/route.js` — depends on `StudentInvoice` aggregates (Phase 2)
- **UI:** `app/dashboard/proprietor/page.js` — KPIs: enrolment, collection rate %, outstanding K, attendance rate
- Access: `proprietor` + optionally `headteacher` for same school
- **No** access to SBA, timetable edit, or full student PII export

Until invoices exist, proprietor view can show: enrolment counts (`Student`), Lipila payment history if logged, attendance rate from `Attendance`.

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

## Phase 2 — Navigation

Show **Fee Management** section only when private:

```js
import { isGovernmentSchool } from '@/lib/school/feeManagementAccess'

// school.ownershipType from SchoolContext / GET /api/school/current
{
  !isGovernmentSchool(school?.ownershipType) && (
    <>
      <Link href="/dashboard/headteacher/fees/schedules">Fee Schedules</Link>
      <Link href="/dashboard/headteacher/fees/invoices">Invoices</Link>
      <Link href="/dashboard/headteacher/fees/payments">Payments</Link>
      <Link href="/dashboard/headteacher/fees/siblings">Sibling Groups</Link>
    </>
  )
}
```

Keep existing **`/dashboard/payments`** (Lipila) in sidebar for private schools until full fee module replaces or complements it.

**Proprietor** (Phase 2): separate nav block when `user.role === 'proprietor'`.

---

## Billing vs school fees (important distinction)

| Concept                         | Who pays          | UI                                                                         | API                                                      |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| **ZSMS subscription**           | School → Bluepeak | `/dashboard/billing`                                                       | `app/api/billing/*`                                      |
| **School fees (tuition, etc.)** | Parent → School   | `/dashboard/payments` (Phase 1), `/dashboard/headteacher/fees/*` (Phase 2) | `app/api/payments/mobile-money`, future `app/api/fees/*` |

Government schools: **school fees blocked**; **billing** for ZSMS plan still applies.

---

## Phase 2 — Migration

```bash
npx prisma migrate dev --name private_school_fees_and_proprietor
npx prisma generate
```

`ownershipType` already migrated: `prisma/migrations/20260613180000_transport_hostel_ownership/`.

Optional dependency for exports/receipts:

```bash
npm install xlsx   # if PDF/Excel fee statements needed
```

---

## Implementation checklist (Phase 2 order)

| Step | Item                                                                           | Depends on              |
| ---- | ------------------------------------------------------------------------------ | ----------------------- |
| 1    | Expose `ownershipType` on `GET /api/school/current` + SchoolContext            | Phase 1                 |
| 2    | Prisma: `FeeSchedule`, `StudentInvoice`, `FeePayment`                          | Migration               |
| 3    | Fee schedules + invoice generation APIs                                        | Step 2                  |
| 4    | Record payments + link Lipila `referenceId` to `FeePayment`                    | Step 3, existing Lipila |
| 5    | Parent portal API + `/dashboard/student/parent-view`                           | Step 3                  |
| 6    | Sibling groups + payment plans                                                 | Step 3                  |
| 7    | Fee overdue cron + SMS                                                         | Step 3, `lib/sms`       |
| 8    | Proprietor role + overview dashboard                                           | Step 3                  |
| 9    | USSD fee balance menu item                                                     | Step 3                  |
| 10   | Public events calendar (extend `Activity` or `SchoolEvent`)                    | Optional                |
| 11   | Update `USER_GUIDE.md` + `SYSTEM_DOCUMENTATION.md` + `npm run docs:api-routes` | Each ship               |

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

_Phase 1 structural work (ownership gating, partial Lipila payments, parent SMS for attendance & results, study assistant) is complete. Begin Phase 2 with section 2.1 (fee schedules + invoices) or the checklist above._
