# System-wide change log — write-path inventory (Prompt 10)

**Last audited:** 2026-07-14

This is a living inventory of mutation-capable surfaces and whether they can be hooked cleanly into `ChangeLogEntry` via a single write-path service (SoT). Counts are approximate from repo scan (~271 mutation route files / ~312 POST|PUT|PATCH|DELETE handlers).

## Infrastructure

| Piece                                 | Status                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ChangeLogEntry` model                | Append-only (INSERT only); Postgres triggers reject UPDATE/DELETE                            |
| Writer                                | `lib/changelog/record.js` → `recordChangeLog`                                                |
| Reader                                | `GET /api/changelog` only (no mutate routes)                                                 |
| Viewer                                | `/dashboard/headteacher/activity` (admin/HT); HOD may use API with department metadata scope |
| Legacy `AuditLog` / `lib/auditLog.js` | Still exists; **3 call sites only** — do not expand; prefer `ChangeLogEntry`                 |

## Module coverage quality

| Module                            | Handlers (approx) | SoT quality       | ChangeLog hooked?  | Notes                                                                                                                            |
| --------------------------------- | ----------------: | ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Timetable**                     |                23 | **mixed**         | **Partial**        | Hooked: `promoteDraftToPublished`, `persistSolverDraft`. Still inline: entries PATCH/DELETE, conflicts/resolve, allocations push |
| **Attendance**                    |                 7 | **clean SoT**     | **Partial**        | Hooked: `openAttendanceSession`, `closeAttendanceSession`. Marks / bulkUpsert next                                               |
| **Fees**                          |                 4 | **clean SoT**     | **Yes (payments)** | `lib/fees/payments.js` `recordPayment`. Invoices/schedules next                                                                  |
| **Students**                      |                 6 | **route scatter** | **Partial**        | Hooked: `deleteStudentCascade` / `deleteUserCascade`. Create/update still in routes                                              |
| **Teachers / users / classes**    |               ~13 | **route scatter** | **No**             | Need roster SoT before reliable coverage                                                                                         |
| **Billing / Lipila / onboarding** |               ~11 | **mixed**         | **No**             | Prefer `lib/payments/lipila.js`, `lib/billing/*`                                                                                 |
| **Results (teacher)**             |                 5 | **route scatter** | **No**             | Fat inline Prisma — extract `lib/results` write SoT first                                                                        |
| **Assessments / ECZ**             |               ~22 | **mixed**         | **No**             | Evidence/accommodations have lib helpers worth extending                                                                         |
| **Guidance**                      |                17 | **mixed**         | **No**             | Has `CaseAccessLog` (access, not mutation trail); case CRUD still inline                                                         |
| **HOD / allocations**             |               ~15 | **mixed**         | **No**             | Tag `metadata.departmentId` when hooking for HOD scoped viewer                                                                   |
| **Notifications / SMS**           |               ~16 | **mixed**         | **No**             | Dispatcher / `persistLog` are natural hooks                                                                                      |
| **Hostel / transport**            |                 6 | **route scatter** | **No**             | No clean write SoT                                                                                                               |
| **Houses**                        |                 3 | **clean SoT**     | **No** (ready)     | `lib/houses` easy next hook                                                                                                      |
| **Government**                    |                 7 | **clean SoT**     | **No** (ready)     | grants/leave/deployment                                                                                                          |
| **Creative Teaching Hub**         |            ~8+ DB | **route scatter** | **No**             | Known gap: multimedia/student-works/field-trips/games — extract SoT before logging                                               |
| **Auth**                          |                 7 | **scatter**       | **No**             | Optional low-priority login events                                                                                               |

## Hooked first (this prompt)

1. Timetable publish — `lib/timetable/promoteDraftToPublished.js`
2. Timetable solver draft persist — `lib/timetable/persistSolverDraft.js`
3. Fee payments — `lib/fees/payments.js`
4. Attendance open/close session — `lib/attendance/sessions.js`
5. Student/user delete cascade — `lib/db/deleteCascade.js`

## Highest-value next SoTs (before more route-level logging)

1. Extract teacher results write SoT → grades trail
2. Fold timetable `entries` PATCH/DELETE + conflicts resolve into a mutate service
3. `lib/attendance/bulkUpsert.js` + mark status changes
4. HOD allocation approve/push with `departmentId` metadata
5. Creative Teaching write SoTs (otherwise activity trail will always have gaps there)
6. Guidance case mutations (beyond access log)
7. Lipila/billing activation

## Policy

- Do **not** add ad-hoc `recordChangeLog` calls in individual API handlers when a shared service already owns the write.
- Every entry must have a human `summary` (who did what to what).
- Never add PATCH/DELETE for `ChangeLogEntry`.
