# ZSMS — Real-Time Attendance SMS to Parents

**Last updated:** 2026-06-12  
**Document version:** 2.0 (implemented)  
**Implementation phase:** Phase 1 complete

This document is the **parent attendance SMS spec** for ZSMS. It was reviewed against the live codebase (`lib/attendance/parentNotifications.js`, `SchoolSmsSettings`, attendance APIs). Features below are **implemented** unless marked optional.

**Related:** [SMS_GUIDE.md](./SMS_GUIDE.md) · [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) · [USER_GUIDE.md](./USER_GUIDE.md)

---

## Review summary (what changed in v2.0)

| Topic            | Old assumption (v1.0)                           | Correct structure (implemented)                                                                     |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Parent phone     | `User.parentPhone`, `user.firstName`/`lastName` | **`Student.guardian_contact`**, **`parent_father_contact`**, **`parent_mother_contact`**            |
| Student name     | `user.firstName` + `user.lastName`              | **`Student.name`**                                                                                  |
| Class            | `Class.grade`                                   | **`Student.class`** or **`Class.year_group`** + **`Class.name`**                                    |
| SMS library file | New `parentNotifications.js` only               | **`lib/attendance/parentNotifications.js`** (+ re-export from `attendanceSms.js`)                   |
| Phone normalize  | Custom `formatZambianPhone` only                | **`normalizeZmPhoneNumber`** / **`normalizePhoneNumbers`** in `lib/sms/normalizePhone.js`           |
| Send function    | Generic `sendSMS()`                             | **`sendAfricasTalkingSms`** from `lib/sms.js`                                                       |
| School toggles   | Fields on `School` model                        | **`SchoolSmsSettings`**: `parentSmsAbsent`, `parentSmsLate`, `parentSmsPresent`, `parentSmsExcused` |
| Settings UI      | `headteacher/settings`                          | **`/dashboard/sms`** — Parent attendance SMS section                                                |
| API blocking     | Could `await` SMS in route                      | **Fire-and-forget** via `scheduleParentAttendanceSmsBatch()`                                        |
| Plan gate        | Not mentioned                                   | **Standard or premium** plan required                                                               |
| Registration     | Add `parentPhone` to User                       | **Already on Student** — `ParentGuardianStep` in enhanced registration                              |

---

## Feature overview

When a teacher marks a student **present**, **late**, **absent**, or **excused**, ZSMS can SMS the parent/guardian in real time.

**Default behaviour:**

| Status  | SMS sent by default |
| ------- | ------------------- |
| absent  | Yes                 |
| late    | Yes                 |
| present | No (opt-in)         |
| excused | No (opt-in)         |

Headteachers configure toggles on **`/dashboard/sms`** → Parent attendance SMS.

---

## Architecture

```
Teacher marks attendance
  → POST /api/attendance (bulk register)
  → POST /api/mobile/sync (offline)
  → recordAttendanceMark / closeAttendanceSession (lesson sessions)
       ↓
  scheduleParentAttendanceSmsBatch()  [fire-and-forget]
       ↓
  notifyParentsBatch() → notifyParentAttendance()
       ↓
  SchoolSmsSettings prefs + plan check
       ↓
  sendAfricasTalkingSms() + pushSmsLog()
```

**Batching:** 5 messages per batch, 500ms delay between batches (Africa's Talking rate limits).

---

## Core module

**File:** `lib/attendance/parentNotifications.js`

| Export                                                                        | Purpose                             |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| `notifyParentAttendance({ studentId, schoolId, status, date, sessionId, … })` | Single student                      |
| `notifyParentsBatch(marks, schoolId, sessionId, date, opts)`                  | Class/bulk with batching            |
| `scheduleParentAttendanceSmsBatch(params)`                                    | Non-blocking wrapper for API routes |
| `buildAttendanceSMS({ studentName, className, status, … })`                   | Message templates                   |
| `extractParentContacts(student)`                                              | Guardian + father + mother phones   |
| `isParentSmsEnabledForStatus(prefs, status)`                                  | Toggle check                        |

**Legacy import:** `import { sendAttendanceStatusSmsBatch } from '@/lib/attendance/attendanceSms'` still works.

---

## Wired routes

| Route                                                 | SMS trigger                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `POST /api/attendance`                                | After `Attendance` upsert — SMS only for **changed** statuses |
| `POST /api/mobile/sync`                               | Changed attendance rows only                                  |
| `recordAttendanceMark` (`lib/attendance/sessions.js`) | PRESENT / LATE / ABSENT / EXCUSED on lesson mark              |
| `closeAttendanceSession`                              | Auto-absent roster → batch absent SMS                         |
| `POST /api/mobile/attendance/sessions/[id]/marks`     | Lesson mark → `recordAttendanceMark` → parent SMS             |
| `POST /api/mobile/attendance/sessions/[id]/close`     | Auto-absent roster → batch absent SMS                         |

---

## Mobile app (`zsms-mobile/`)

Parent SMS is **server-side only** — the Expo app never calls Africa's Talking directly. Teachers mark attendance; the API triggers SMS after save or sync.

### TypeScript paths

`zsms-mobile/tsconfig.json` extends Expo base config:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Imports use `@/api/*`, `@/store/*`, `@/types` — not the web app’s `@/lib/*` (no shared Prisma/SMS code in the mobile bundle).

### Two attendance flows

| Flow               | Mobile UI                              | Online API                                         | Offline queue → sync                          |
| ------------------ | -------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| **Daily register** | `app/attendance/[classId].tsx`         | `POST /api/attendance` via `src/api/attendance.ts` | `enqueueAttendance` → `POST /api/mobile/sync` |
| **Lesson session** | `app/attendance/session/[classId].tsx` | `POST /api/mobile/attendance/sessions/[id]/marks`  | `lessonSession` item in offline queue         |

**Types:** `AttendanceStatus` in `src/types/index.ts` — `'present' | 'absent' | 'late' | 'excused'` (matches server).

### Offline sync

`src/store/offlineQueue.ts` → `src/api/sync.ts` batches:

```ts
POST /api/mobile/sync
{ attendance: AttendanceBatch[], scores: [], lessonSessions: LessonSessionSyncPayload[] }
```

Parent SMS runs on the server when:

1. **Attendance batch** — only rows whose status **changed** vs existing `Attendance` record
2. **Lesson marks** — each `recordAttendanceMark` (present/late/absent/excused per school toggles)
3. **Session close** — unmarked pupils marked absent → `notifyParentsBatch` (unless `sendAbsentSms: false`)

Teachers flush the queue from **Profile → Sync now** or the home screen sync button.

### Mobile files (reference)

| File                                  | Role                           |
| ------------------------------------- | ------------------------------ |
| `src/api/attendance.ts`               | Daily register save            |
| `src/api/attendanceSessions.ts`       | Open/mark/close lesson session |
| `src/api/sync.ts`                     | Offline flush                  |
| `src/store/attendanceStore.ts`        | Register draft + save/queue    |
| `src/store/sessionAttendanceStore.ts` | Lesson session state           |
| `src/store/offlineQueue.ts`           | AsyncStorage queue             |

### What mobile does not do

- Collect parent phone numbers (already on `Student` from web registration)
- Configure SMS toggles (headteacher: **Dashboard → SMS** on web)
- Show SMS delivery status (optional future: read from `/api/sms/logs`)

**Env:** `EXPO_PUBLIC_API_BASE_URL` must point at the school’s ZSMS host — see `zsms-mobile/docs/EXPO_ACCOUNT_AND_ENV.md`.

---

## School settings (Prisma)

```prisma
model SchoolSmsSettings {
  parentSmsAbsent   Boolean @default(true)
  parentSmsLate     Boolean @default(true)
  parentSmsPresent  Boolean @default(false)
  parentSmsExcused  Boolean @default(false)
  // … smsBalance, lowBalanceThreshold, etc.
}
```

**API:** `GET/PATCH /api/sms/balance` — includes parent SMS toggles.

**Migration:** `prisma/migrations/20260614120000_parent_attendance_sms_settings/`

---

## Parent contact data

Collected at student registration (`components/forms/enhanced-registration/ParentGuardianStep.js`):

- `parent_father_contact`, `parent_mother_contact`, `guardian_contact`
- Names/emails on `Student` for display (not required for SMS)

---

## Dev test endpoint

`POST /api/attendance/test-sms` — **disabled in production**

```json
{ "studentId": "…", "status": "absent" }
```

---

## Operator notes

1. **Never block attendance** on SMS failure — all sends are fire-and-forget with `.catch()` logging.
2. **Credits** — each SMS uses school `smsBalance` (standard/premium plans).
3. **Multiple recipients** — father, mother, and guardian numbers are deduped and may all receive the same message.
4. **Chronic absence** — separate flow in `sendChronicAbsenteeAlerts()` (`lib/attendance/sessions.js`).

---

## Implementation checklist (done)

| Step | Item                                                      | Status          |
| ---- | --------------------------------------------------------- | --------------- |
| 1    | `lib/attendance/parentNotifications.js`                   | Done            |
| 2    | Wire attendance + mobile + session marks                  | Done            |
| 3    | `SchoolSmsSettings` toggles + migration                   | Done            |
| 4    | `/dashboard/sms` UI                                       | Done            |
| 5    | Student registration parent phones                        | Already existed |
| 6    | Unit tests `__tests__/unit/parent-attendance-sms.test.js` | Done            |
| 7    | `SYSTEM_DOCUMENTATION.md`                                 | Done            |

---

_Parent attendance SMS is live. Configure toggles under Dashboard → SMS._
