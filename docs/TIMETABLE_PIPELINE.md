# Timetable pipeline (canonical path)

See [`lib/timetable/pipeline.js`](../lib/timetable/pipeline.js) for constants.

## Canonical flow (production)

1. HOD pushes `TeacherAllocation` rows (`status: pushed`) for term/year
2. Headteacher **Generate Perfect Timetable** → `POST /api/timetable/generate` ([`scheduler.ts`](../lib/timetable/scheduler.ts))
3. Optional manual edits → `POST /api/timetable/entries/sync-draft`
4. **Publish** → `POST /api/timetable/publish` (server validates hard conflicts)
5. **View** → `GET /api/timetable/view?status=published`

UI: [`app/dashboard/headteacher/timetable/page.tsx`](../app/dashboard/headteacher/timetable/page.tsx)

## Deprecated / legacy paths (do not use in production UI)

| Entry                                      | API                                   | Notes                           |
| ------------------------------------------ | ------------------------------------- | ------------------------------- |
| Generate (Greedy) button                   | `POST /api/timetable/solver/generate` | In-memory only until sync-draft |
| OR-Tools route                             | `POST /api/timetable/solver/ortools`  | Requires `ORTOOLS_SOLVER_URL`   |
| AutoGenerateButton                         | Client CSP+GA                         | Does not use HOD allocations    |
| `/dashboard/timetable` greedy auto-publish | solver + publish                      | Bypasses allocation pipeline    |

## Collision detection vs generation

- **Detection:** [`collisionDetector.ts`](../lib/timetable/collisionDetector.ts), [`validateTimetable.ts`](../lib/timetable/validateTimetable.ts)
- **Publish gate:** [`validateDraftEntries.js`](../lib/timetable/validateDraftEntries.js) on `POST /api/timetable/publish`
- **Solver constraints:** [`constraintRules.ts`](../lib/timetable/constraintRules.ts) applied in `greedySolver.ts` and `scheduler.ts`
