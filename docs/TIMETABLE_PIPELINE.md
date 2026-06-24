# Timetable pipeline (canonical path)

See [`lib/timetable/pipeline.js`](../lib/timetable/pipeline.js) for constants.

## Canonical flow (production)

1. HOD pushes `TeacherAllocation` rows (`status: pushed`) for term/year
2. HOD may lock teachers to periods via `TeacherPeriodAssignment` (`lockedForGeneration: true`)
3. Headteacher **Generate Perfect Timetable** → `POST /api/timetable/generate` ([`hybridGenerate.ts`](../lib/timetable/hybridGenerate.ts))
   - **Preflight** — [`preflightFeasibility.ts`](../lib/timetable/preflightFeasibility.ts) (load, locks, break-span blocks)
   - **Pass 1** — enhanced backtracking ([`scheduler.ts`](../lib/timetable/scheduler.ts), multi-restart, soft constraints relaxed during search). Candidate slots are ranked with [`scoreSchedulerPlacement`](../lib/timetable/slotScoring.ts) and [`compareDaySpread`](../lib/timetable/lessonOrdering.ts) so teachers are spread across **weekdays** and **period numbers** (not every lesson on one day or in period 1–2 each morning).
   - **Pass 2** — optional solver-service fallback when `ORTOOLS_SOLVER_URL` is set ([`buildBlockSolverPayload.ts`](../lib/timetable/buildBlockSolverPayload.ts))
   - **Pass 3** — bounded repair pass on remaining unplaced blocks
   - Draft is saved **only** when `allowPartial: false` (default for Perfect Timetable) and zero hard conflicts + zero unplaced blocks
4. Optional manual edits → `POST /api/timetable/entries/sync-draft`
5. **Publish** → `POST /api/timetable/publish` (server validates hard conflicts)
6. **View** → `GET /api/timetable/view?status=published`

UI: [`app/dashboard/headteacher/timetable/page.tsx`](../app/dashboard/headteacher/timetable/page.tsx) — aSc-style class wall ([`AscClassWallGrid.tsx`](../components/timetable/AscClassWallGrid.tsx)), generation progress modal, explicit **Auto-fix conflicts** (no silent auto-resolve on load).

## Environment

| Variable             | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `ORTOOLS_SOLVER_URL` | Base URL for `solver-service` `/solve` (e.g. `http://localhost:8001`) |

Deploy [`solver-service/`](../solver-service/) separately (Docker). Without it, generation uses backtracking + repair only.

## Deprecated / legacy paths (do not use in production UI)

| Entry                                      | API                                   | Notes                           |
| ------------------------------------------ | ------------------------------------- | ------------------------------- |
| Generate (Greedy) button                   | `POST /api/timetable/solver/generate` | In-memory only until sync-draft |
| OR-Tools route (standalone)                | `POST /api/timetable/solver/ortools`  | Superseded by hybrid generate   |
| AutoGenerateButton                         | Client CSP+GA                         | Does not use HOD allocations    |
| `/dashboard/timetable` greedy auto-publish | solver + publish                      | Bypasses allocation pipeline    |

## Collision detection vs generation

- **Detection:** [`collisionDetector.ts`](../lib/timetable/collisionDetector.ts), [`validateTimetable.ts`](../lib/timetable/validateTimetable.ts)
- **Publish gate:** [`validateDraftEntries.js`](../lib/timetable/validateDraftEntries.js) on `POST /api/timetable/publish`
- **Solver constraints:** [`constraintRules.ts`](../lib/timetable/constraintRules.ts) applied in `scheduler.ts`, `greedySolver.ts`, and solver-service
