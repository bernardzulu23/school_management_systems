# Timetable pipeline (canonical path)

See [`lib/timetable/pipeline.js`](../lib/timetable/pipeline.js) for constants.

## Canonical flow (production)

1. HOD creates `DepartmentAllocation` rows and **submits** them (`/dashboard/hod/allocation`)
2. Headteacher **approves** on **Department Allocations** → syncs one `TeacherAllocation` per class (`status: pushed`) via [`departmentApprovalSync.js`](../lib/timetable/departmentApprovalSync.js)
3. HOD may lock teachers to periods via `TeacherPeriodAssignment` (`lockedForGeneration: true`)
4. Headteacher **Generate Perfect Timetable** → `POST /api/timetable/generate` ([`hybridGenerate.ts`](../lib/timetable/hybridGenerate.ts))
   - **Normalize** — [`normalizePushedAllocations.js`](../lib/timetable/normalizePushedAllocations.js) plans per-class repairs (`deferWrites`); upserts commit **with** draft entry inserts in one transaction (no orphan `TeacherAllocation` rows if generation fails)
   - **Preflight** — [`preflightFeasibility.ts`](../lib/timetable/preflightFeasibility.ts) (load, locks, break-span blocks)
   - **Pass 1** — enhanced backtracking ([`scheduler.ts`](../lib/timetable/scheduler.ts), multi-restart, soft constraints relaxed during search). Candidate slots are ranked with [`scoreSchedulerPlacement`](../lib/timetable/slotScoring.ts) and [`compareDaySpread`](../lib/timetable/lessonOrdering.ts) so teachers are spread across **weekdays** and **period numbers** (not every lesson on one day or in period 1–2 each morning).
   - **Pass 2** — optional solver-service fallback when `ORTOOLS_SOLVER_URL` is set ([`buildBlockSolverPayload.ts`](../lib/timetable/buildBlockSolverPayload.ts))
   - **Pass 3** — bounded repair pass on remaining unplaced blocks
   - Draft is saved **only** when `allowPartial: false` (default for Perfect Timetable) and zero hard conflicts + zero unplaced blocks
5. Optional manual edits → `POST /api/timetable/entries/sync-draft`
6. **Publish** → `POST /api/timetable/publish` (server and UI gate on **hard** conflicts / audit errors only; soft warnings do not block publish — Dismiss still hides noise in Conflict Centre)
7. **View** → `GET /api/timetable/view?status=published` (teachers: own periods; HOD: department teachers; students: class + enrolled subjects)

UI: [`app/dashboard/headteacher/timetable/page.tsx`](../app/dashboard/headteacher/timetable/page.tsx) — aSc-style class wall ([`AscClassWallGrid.tsx`](../components/timetable/AscClassWallGrid.tsx)), generation progress modal, explicit **Auto-fix conflicts** (no silent auto-resolve on load).

**Period presets:** `p6` = 3 doubles (6), `p5` = 1 double + 1 triple (5), `p4` = 2 doubles (4). Legacy rows that stored `p4` as 2 doubles + 1 single are repaired in [`periodExpansion.ts`](../lib/timetable/periodExpansion.ts) to match `periodsPerWeek`.

**Shared break rules:** both [`scheduler.ts`](../lib/timetable/scheduler.ts) and [`greedySolver.ts`](../lib/timetable/greedySolver.ts) use `consecutivePeriodsAreValid` / `deriveBreakAfterPeriodsFromFlatSlots` so doubles cannot span break boundaries. `findSlotRun` does **not** require abutting clock minutes (transition gaps are allowed).

## Environment

| Variable             | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `ORTOOLS_SOLVER_URL` | Base URL for `solver-service` `/solve` (e.g. `http://localhost:8001`) |

Deploy [`solver-service/`](../solver-service/) separately (Docker). Without it, generation uses backtracking + repair only.

## Deprecated / legacy paths (do not use in production UI)

| Entry                                      | API                                    | Notes                                |
| ------------------------------------------ | -------------------------------------- | ------------------------------------ |
| Generate (Greedy) button                   | `POST /api/timetable/solver/generate`  | In-memory only until sync-draft      |
| OR-Tools route (standalone)                | `POST /api/timetable/solver/ortools`   | Superseded by hybrid generate        |
| AutoGenerateButton                         | Client CSP+GA                          | Does not use HOD allocations         |
| `/dashboard/timetable` greedy auto-publish | solver + publish                       | Bypasses allocation pipeline         |
| Direct `TeacherAllocation` push            | `POST /api/timetable/allocations/push` | Prefer Department Allocation approve |

## Collision detection vs generation

- **Detection:** [`collisionDetector.ts`](../lib/timetable/collisionDetector.ts), [`validateTimetable.ts`](../lib/timetable/validateTimetable.ts)
- **Publish gate:** [`validateDraftEntries.js`](../lib/timetable/validateDraftEntries.js) on `POST /api/timetable/publish`
- **Solver constraints:** [`constraintRules.ts`](../lib/timetable/constraintRules.ts) applied in `scheduler.ts`, `greedySolver.ts`, and solver-service
