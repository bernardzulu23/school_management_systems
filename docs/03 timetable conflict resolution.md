# ZSMS — Timetable Conflict Resolution

**Last updated:** 2026-06-12  
**Document version:** 3.1 (Phase 3 integration)  
**Implementation phase:** Phase 1 + Phase 2 + **Phase 3** (UI/meta wiring)

This document is the **timetable conflict detection and resolution spec** for ZSMS. It was reviewed against the live codebase (`lib/timetable/*`, `app/dashboard/headteacher/timetable/page.tsx`, `app/api/timetable/*`, `prisma/schema.prisma`). **Phase 2** adds server-side conflict audit APIs, persisted draft metadata, and a dedicated Conflict Resolution Centre page.

**Companions:** [01 government school features.md](./01%20government%20school%20features.md) · [02 private school features.md](./02%20private%20school%20features.md)

**Related:** [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) · [API_ROUTES.md](./API_ROUTES.md) · [USER_GUIDE.md](./USER_GUIDE.md)

---

## Review summary (what changed in v2.0)

| Topic                      | Old assumption (v1.0)                     | Correct structure (Phase 1)                                                                                                             |
| -------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Conflict engine file       | `lib/timetable/conflictDetector.ts` (new) | **`lib/timetable/collisionDetector.ts`** — exists; rich `CollisionDetector` class                                                       |
| Matrix validation          | Only in proposed detector                 | **`lib/timetable/validateTimetable.ts`** — hard/soft types for publish                                                                  |
| Deduping                   | Not mentioned                             | **`lib/timetable/conflictDedupe.ts`** — `dedupeConflicts`, `countUniqueConflicts`                                                       |
| Auto-fix                   | UI buttons only                           | **`lib/timetable/autoResolver.ts`** + store `autoResolveConflicts()`                                                                    |
| Conflict UI                | Dedicated `/timetable/conflicts` page     | **`ConflictDisplay`** component + **Conflicts tab** on `/dashboard/headteacher/timetable`                                               |
| Conflict APIs              | `GET/POST /api/timetable/conflicts/*`     | **`GET /api/timetable/conflicts`**, **`POST /api/timetable/conflicts/resolve`**, dev **`POST /api/timetable/conflicts/seed-test`**      |
| Primary draft model        | `TimetableEntry` on `TimetableVersion`    | **`TimetableAllocationEntry`** (term/year, draft/published) — headteacher workflow                                                      |
| Persisted conflict meta    | Proposed on `TimetableVersion`            | **`TimetableDraftMeta`** per `schoolId` + `term` + `academicYear`                                                                       |
| Conflict UI (server)       | Dedicated page only                       | **`/dashboard/headteacher/timetable/conflicts`** + existing Conflicts tab                                                               |
| Server audit module        | `conflictDetector.ts` (new)               | **`lib/timetable/conflictAudit.js`** — wraps `validateTimetable` + workload/missing-period checks                                       |
| Teacher on allocations     | `Teacher` model + `user.firstName`        | **`TeacherAllocation.teacherId` → `User`**; display **`User.name`**                                                                     |
| Teacher on version entries | Same as allocations                       | **`TimetableEntry.teacherId` → `Teacher`** (profile row, not User id)                                                                   |
| Class grade field          | `Class.grade`                             | **`Class.year_group`** + **`Class.name`** (e.g. Form 1A)                                                                                |
| Room conflicts             | Always checked                            | **`TIMETABLE_CLASS_CENTRIC = true`** in `lib/timetable/classCentric.ts` — room checks filtered out for Zambian grade-centric scheduling |
| Tenancy                    | `resolveAuthenticatedSchoolId` only       | Timetable routes mostly use **`resolveSchoolId(req, user)`** + **`guardSchoolOnlyTimetable`** / **`requireSchoolType(['SCHOOL'])`**     |
| Generator                  | `hybridGenerate.ts` only                  | **Pipeline:** `preflightFeasibility` → `scheduler` (backtrack) → OR-Tools/greedy solver → **`validateTimetable`**                       |
| `conflictCount` on version | Proposed schema fields                    | **`TimetableDraftMeta`** — `conflictCount`, `conflictErrors`, `conflictWarnings`, `canPublish`, `lastScannedAt`                         |
| Legacy version model       | Assumed primary                           | **`TimetableVersion` + `TimetableEntry`** still in schema; separate publish at `/api/timetable/version/publish`                         |
| Backend stack              | “Node.js/Express”                         | **Next.js 16 App Router** API routes only                                                                                               |

---

## The problem (unchanged intent)

Conflicts appear when the master timetable has:

1. A **teacher** assigned to two classes at the same time
2. A **class** assigned two subjects in the same period
3. A **room** double-booked (only when class-centric mode is off)
4. A teacher **over-allocated** vs weekly period budget (soft / warning)
5. **Unplaced** lesson blocks after generation (preflight or solver could not place all HOD allocations)

Phase 1 detects and resolves most of (1)–(2) in the headteacher UI. **Phase 2** adds persistent server audit APIs, workload/missing-period checks, draft conflict metadata, and the Conflict Resolution Centre.

---

## Phase 1 — Structural foundation (implemented)

### 1. Timetable data paths (know which model to query)

| Path                             | Models                                           | Used for                                                   |
| -------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| **Headteacher master (primary)** | `TeacherAllocation` → `TimetableAllocationEntry` | HOD push → generate → edit → publish                       |
| **Legacy versioned**             | `TimetableVersion` → `TimetableEntry`            | Older solver/version flow; `TeacherPeriodAssignment` locks |
| **Config**                       | `TimetableConfig`, `TimeSlot`                    | Bell schedule, working days, period count                  |

**Headteacher flow:**

```
HOD allocations (pushed) → POST /api/timetable/generate
  → hybridGenerate (preflight + scheduler + solver)
  → draft TimetableAllocationEntry (sync-draft / generate persist)
  → client Zustand store (Assignment[]) + CollisionDetector
  → POST /api/timetable/publish (validateDraftEntriesForPublish — zero hard conflicts)
```

### 2. Conflict detection layers (live)

| Layer            | Module                                                           | When it runs                                   |
| ---------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| Real-time UI     | `CollisionDetector` in `collisionDetector.ts`                    | Every assignment change in `timetableStore.ts` |
| Deduped count    | `conflictDedupe.ts`                                              | `getConflictCount()` in store                  |
| Publish gate     | `validateDraftEntriesForPublish` → `validateTimetable.ts`        | `POST /api/timetable/publish`                  |
| Post-generate    | `hybridGenerate.ts` → `getHardConflicts(validateTimetable(...))` | `POST /api/timetable/generate`                 |
| Draft save guard | `entries/sync-draft/route.js`                                    | Grade double-booking blocked on sync           |
| Suggestions      | `SuggestionEngine` + `CollisionDetector.suggestAlternatives`     | `ConflictDisplay` apply buttons                |

**Conflict types (runtime — `types.ts` / `collisionDetector.ts`):**

| Type                         | Severity | Phase 1                           |
| ---------------------------- | -------- | --------------------------------- |
| `TeacherDoubleBooked`        | critical | Yes                               |
| `ClassDoubleBooked`          | critical | Yes                               |
| `RoomDoubleBooked`           | critical | Filtered when class-centric       |
| `TeacherUnavailable`         | critical | Yes (if availability windows set) |
| `CapacityExceeded`           | high     | Filtered when class-centric       |
| `TravelTimeImpossible`       | high     | Yes (traveling-teacher routes)    |
| `AgriculturalAttendanceRisk` | medium   | Season modes                      |
| `TEACHER_CONSECUTIVE_LIMIT`  | soft     | `validateTimetable.ts`            |
| `SUBJECT_DISTRIBUTION`       | soft     | `validateTimetable.ts`            |

**Matrix validation types (`validateTimetable.ts`):** `TEACHER_DOUBLE_BOOKED`, `CLASS_DOUBLE_BOOKED`, `ROOM_DOUBLE_BOOKED` (hard); consecutive-limit and subject distribution (soft).

### 3. Hybrid generator (root-cause prevention)

**File:** `lib/timetable/hybridGenerate.ts`

```
preflightFeasibility → backtracking (scheduler.ts) → OR-Tools/greedy fallback → repair → validateTimetable
```

- **Preflight:** `lib/timetable/preflightFeasibility.ts` — total demand vs teaching slots, locked-slot feasibility
- **Placement:** `lib/timetable/scheduler.ts` — compound teacher + class availability during backtrack
- **Solver:** `buildBlockSolverPayload.ts`, `POST /api/timetable/solver/ortools`, greedy at `solver/generate`
- **Optional LLM repair:** `lib/timetable/llm-resolver.ts` when `useLlm: true` on generate
- **Output:** `hardValidationCount` on `HybridGenerateResult`

**API:** `POST /api/timetable/generate` — roles: headteacher, admin; requires `TeacherAllocation.status = 'pushed'`.

### 4. Auto-resolution (client)

**File:** `lib/timetable/autoResolver.ts`

Iterative moves: same-day free slot → any-day free slot → swap. Wired from:

- `useTimetableStore().autoResolveConflicts()`
- Headteacher page **Auto-fix conflicts** button

Does **not** persist to DB until user saves draft (`POST /api/timetable/entries/sync-draft`) or regenerates.

### 5. Headteacher UI (integrated + Conflict Centre)

| Item                           | Path                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| Master timetable               | `/dashboard/headteacher/timetable`                                   |
| **Conflict Resolution Centre** | `/dashboard/headteacher/timetable/conflicts`                         |
| Conflicts tab                  | Same page, tab `conflicts`                                           |
| Conflict list (client)         | `components/timetable/ConflictDisplay.tsx`                           |
| Conflict list (server)         | `app/dashboard/headteacher/timetable/conflicts/page.js`              |
| State                          | `lib/timetable/timetableStore.ts` (Zustand + persist)                |
| KPI                            | Conflict count links to Conflict Centre when &gt; 0                  |
| Sidebar                        | `Timetable Conflicts` → `/dashboard/headteacher/timetable/conflicts` |

### 6. Publish enforcement

```js
// app/api/timetable/publish/route.js
const validation = await validateDraftEntriesForPublish(prisma, { schoolId, term, academicYear })
if (!validation.ok) {
  return NextResponse.json(
    {
      error: 'Cannot publish: draft timetable has hard conflicts. Fix conflicts before publishing.',
      hard: validation.hard,
      soft: validation.soft,
    },
    { status: 409 }
  )
}
```

### 7. Class-centric mode (Zambian default)

```ts
// lib/timetable/classCentric.ts
export const TIMETABLE_CLASS_CENTRIC = true
```

Room-related conflicts are stripped from UI and auto-resolve. Enable room tracking in Phase 2 only if product adds physical room allocation.

### 8. Tenancy and access pattern

```js
import { getAuthUser } from '@/lib/middleware/auth'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { requireSchoolType } from '@/lib/middleware/individual-gate'

const user = await getAuthUser(request)
const schoolId = await resolveSchoolId(request, user)
const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
if (!typeCheck.allowed) return typeCheck.response
```

Solo workspaces (`SchoolType.INDIVIDUAL`) are blocked from school timetable APIs.

### 9. Key APIs

| Route                                         | Purpose                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| **`GET /api/timetable/conflicts`**            | Server audit of draft entries; persists `TimetableDraftMeta`                   |
| **`POST /api/timetable/conflicts/resolve`**   | `REASSIGN_TEACHER`, `MOVE_TO_SLOT`, `REMOVE_ENTRY`, `SWAP_SLOTS` on draft rows |
| **`POST /api/timetable/conflicts/seed-test`** | Dev-only mock conflicts (non-production)                                       |
| `GET/POST /api/timetable/generate`            | Hybrid generation + **`conflictSummary`** after save                           |
| `POST /api/timetable/publish`                 | Publish draft after hard-conflict check (`PUBLISH_BLOCKED_BY_CONFLICTS`)       |
| `GET /api/timetable/view`                     | Load assignments for store (role-scoped)                                       |
| `GET/PATCH/DELETE /api/timetable/entries`     | CRUD on `TimetableAllocationEntry`                                             |
| `POST /api/timetable/entries/sync-draft`      | Persist in-memory grid to draft rows                                           |
| `POST /api/timetable/assignTeacherToPeriod`   | Manual cell assignment                                                         |
| `GET/POST /api/timetable/allocations`         | HOD allocation management                                                      |
| `POST /api/timetable/allocations/push`        | Push approved allocations for generation                                       |

See [API_ROUTES.md](./API_ROUTES.md) for the full `/api/timetable` tree.

---

## Already available (Phase 1 — no Phase 2 required)

| Feature                          | Location                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| Conflict scan on edit            | `timetableStore.detectConflicts()`                             |
| Suggested fixes (move/swap/room) | `CollisionDetector.suggestAlternatives`                        |
| One-click auto-fix               | `autoResolveConflicts()`                                       |
| Conflict severity grouping       | `ConflictDisplay` (critical / high / medium / low)             |
| Unplaced lessons panel           | Headteacher page after partial generate                        |
| Teacher colours                  | `/api/timetable/teacher-colors`                                |
| HOD department timetable         | `/dashboard/hod/timetable`                                     |
| Teacher / student views          | `/dashboard/timetable/teacher`, `/dashboard/timetable/student` |
| Substitution model               | `Substitution` + cover tab on headteacher page                 |

---

## Phase 2 — Conflict resolution modules (implemented 2026-06-12)

Gate with existing school-only guards; no ownership split (timetable is all `SchoolType.SCHOOL`).

---

### FEATURE 2.1 — Server-side conflict audit API

**Status:** ✅ Implemented — `lib/timetable/conflictAudit.js`

1. Loads `TimetableAllocationEntry` for `{ schoolId, term, academicYear, status: 'draft' }`
2. Maps via `mapDbEntriesToAssignments`
3. Runs `validateTimetable` + teacher workload + missing-period audits
4. Persists summary to `TimetableDraftMeta`

**API:** `GET /api/timetable/conflicts?term=&academicYear=`

---

### FEATURE 2.2 — Server-side resolution API

**Status:** ✅ Implemented — `POST /api/timetable/conflicts/resolve`

| Action             | Effect                                                     |
| ------------------ | ---------------------------------------------------------- |
| `REASSIGN_TEACHER` | PATCH `TimetableAllocationEntry.teacherId`                 |
| `MOVE_TO_SLOT`     | PATCH day/time/periodNumber (or copy from `targetEntryId`) |
| `REMOVE_ENTRY`     | DELETE row                                                 |
| `SWAP_SLOTS`       | Transaction: swap two entries' slot fields                 |

Re-scans and updates `TimetableDraftMeta` after each action.

---

### FEATURE 2.3 — Workload and coverage audits

**Status:** ✅ Partial — `TEACHER_OVER_ALLOCATED`, `MISSING_PERIODS` in `conflictAudit.js`

| Check                        | Source                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| Assigned periods per teacher | Count draft `TimetableAllocationEntry` rows                        |
| Expected periods             | Sum `TeacherAllocation.periodsPerWeek` for pushed allocations      |
| Missing subject coverage     | `MISSING_PERIODS` when placed &lt; `periodsPerWeek` per allocation |

**Planned:** `CLASS_MISSING_SUBJECT` granularity, unplaced blocks from generate in audit response.

---

### FEATURE 2.4 — Persist conflict summary on publish/generate

**Status:** ✅ Implemented — `TimetableDraftMeta` + post-generate audit in `POST /api/timetable/generate`

Migration: `20260615120000_timetable_draft_conflict_meta`

---

### FEATURE 2.5 — Dedicated Conflict Resolution Centre

**Status:** ✅ Implemented — `/dashboard/headteacher/timetable/conflicts`

Conflicts tab on main timetable page remains. KPI links to Conflict Centre when count &gt; 0. Sidebar: **Timetable Conflicts**.

Dev mock: `POST /api/timetable/conflicts/seed-test` (non-production).

---

### FEATURE 2.6 — Generator hardening (extend Phase 1)

**Status:** Partial — post-generate audit persisted; scheduler already enforces placement constraints

**Remaining:** Full hard-conflict rejection on `sync-draft`; per-teacher cap from allocation sum during placement.

---

### FEATURE 2.7 — Room allocation mode (optional)

**Status:** Planned (off by default)

If a school enables physical rooms:

1. Set `TIMETABLE_CLASS_CENTRIC = false` (env or per-school `TimetableConfig` flag)
2. Enable `includeRoomChecks: true` in `validateTimetable` and publish validation
3. Show `RoomDoubleBooked` in `ConflictDisplay`

Requires `Classroom` assignments on entries (`TimetableEntry.classroomId` exists; extend allocation entries if needed).

---

## Phase 2 — Navigation

Sidebar: **Timetable Conflicts** → `/dashboard/headteacher/timetable/conflicts` with live badge from `GET /api/timetable/draft-meta` (errors red, warnings amber). Main timetable hub KPI uses server `conflictErrors` / `conflictWarnings`; Conflicts tab shows rescan + link to Conflict Centre.

---

## Phase 3 — UI / meta integration (implemented)

| Item                                     | Detail                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/timetable/draft-meta`          | Lightweight read of `TimetableDraftMeta`; `?refresh=true` runs full audit               |
| `draftMeta` on `GET /api/timetable/view` | Included for headteacher/admin/HOD when term/year provided                              |
| `hooks/useTimetableDraftMeta.ts`         | Client hook + `timetable-conflicts-updated` invalidation event                          |
| Main timetable KPI                       | Server error/warning counts; client editor count shown as preview when stale            |
| `canPublish`                             | True when audit **errors** are zero (soft warnings do not block; matches publish API)   |
| Sidebar badge                            | Timetable Conflicts nav item shows error/warning count                                  |
| `PATCH /api/timetable/entries`           | Rejects patches that introduce hard conflicts; rescans meta                             |
| `POST /api/timetable/entries/sync-draft` | Full `validateTimetable` hard gate (not just grade double-book)                         |
| `APPLY_SUGGESTION` resolve action        | Alias of move-to-slot for detector suggestions                                          |
| Suggestion enrichment                    | `conflictAudit.js` attaches `CollisionDetector.suggestAlternatives` on matrix conflicts |
| Publish meta sync                        | `POST /api/timetable/publish` refreshes `TimetableDraftMeta` on pass or fail            |

**Note:** Auto-fix on the main Conflicts tab remains a **local preview** until draft is saved or fixes are applied in Conflict Centre.

---

## Phase 2 — Migration

```bash
npx prisma migrate deploy   # applies 20260615120000_timetable_draft_conflict_meta
npx prisma generate
```

---

## Implementation checklist (Phase 2)

| Step | Item                                                 | Status                      |
| ---- | ---------------------------------------------------- | --------------------------- |
| 1    | `lib/timetable/conflictAudit.js`                     | ✅                          |
| 2    | `GET /api/timetable/conflicts`                       | ✅                          |
| 3    | Server validation on `PATCH /api/timetable/entries`  | ✅                          |
| 4    | `POST /api/timetable/conflicts/resolve`              | ✅                          |
| 5    | Workload / missing-period audits                     | ✅ partial                  |
| 6    | `TimetableDraftMeta` + post-generate persist         | ✅                          |
| 7    | Align `sync-draft` with full hard-conflict rejection | ✅                          |
| 8    | HOD read-only conflict summary                       | ✅ (draft-meta counts only) |
| 9    | `USER_GUIDE.md` conflict centre section              | Planned                     |
| 10   | `SYSTEM_DOCUMENTATION.md` + API routes               | ✅                          |
| 11   | Phase 3: draft-meta API, main UI KPI, sidebar badge  | ✅                          |

---

## Reference — correct assignment shape

```js
// lib/timetable/mapEntriesToAssignments.js — teacherId is User.id
{
  id: entry.id,
  dayOfWeek: 'monday',       // normalized lowercase in store
  startTime: '08:00',
  endTime: '08:40',
  period: entry.periodNumber,
  teacherId: entry.teacherId, // User.id from TeacherAllocation
  teacherName: entry.allocation?.teacher?.name,
  classId: entry.classId,
  className: entry.allocation?.class?.name,
  subjectId: entry.subjectId,
  subjectName: entry.allocation?.subject?.name,
}
```

```js
// validateTimetable — publish hard gate
import { validateTimetable, getHardConflicts } from '@/lib/timetable/validateTimetable'
const hard = getHardConflicts(validateTimetable(assignments, { includeRoomChecks: false }))
// hard.length must be 0 before publish
```

---

## Related documentation

| Document                                                                     | Use                               |
| ---------------------------------------------------------------------------- | --------------------------------- |
| [01 government school features.md](./01%20government%20school%20features.md) | Government Phase 2 (EMIS, grants) |
| [02 private school features.md](./02%20private%20school%20features.md)       | Private fees Phase 2              |
| [API_ROUTES.md](./API_ROUTES.md)                                             | Timetable route index             |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)                         | Architecture overview             |

---

_Phase 1 delivers collision detection, auto-resolve, hybrid generation with validation, Conflicts tab UI, and publish hard-gating. Phase 2 adds server audit APIs, Conflict Resolution Centre, and `TimetableDraftMeta` persistence. Phase 3 wires the main timetable hub and sidebar to server conflict meta and hardens entry mutations._
