# HOD department file pages — API audit (PROMPT 4-A)

**Date:** June 2026  
**Method:** Static review of page sources and `app/api/**` route inventory.

| HOD page         | API path called | Status                                              | Prisma model |
| ---------------- | --------------- | --------------------------------------------------- | ------------ |
| `budget`         | _(none)_        | **MOCK ONLY** — inline `budgetOverview` sample data | No           |
| `correspondence` | _(none)_        | **MOCK ONLY** — empty `incoming`/`outgoing` arrays  | No           |
| `meetings`       | _(none)_        | **MOCK ONLY** — inline sample meetings              | No           |
| `minutes`        | _(none)_        | **STATIC UI** — links to meetings only              | No           |
| `stock-book`     | _(none)_        | **MOCK ONLY** — `stockData` always `[]`             | No           |
| `staff-meetings` | _(none)_        | **STATIC UI** — links to meetings only              | No           |
| `daily-routine`  | _(none)_        | **MOCK ONLY** — inline sample routine tasks         | No           |

## Working HOD pages (for comparison)

| Page                  | API                                                     | Status   |
| --------------------- | ------------------------------------------------------- | -------- |
| `timetable`           | `GET /api/timetable/view`, `/api/users`, `/api/classes` | REAL API |
| `lesson-plans`        | `GET /api/lesson-plans`                                 | REAL API |
| `exam-analysis`       | `GET /api/dashboard/hod/exam-analysis`                  | REAL API |
| `teacher-performance` | `GET /api/dashboard/hod/teacher-performance`            | REAL API |
| `cpd`                 | `POST /api/dashboard/hod/teacher-progress`              | REAL API |

## Gating

All MOCK / STATIC pages are behind `lib/featureFlags.js` (`HOD_*` flags default `false`). Enable per environment with `FEATURE_FLAG_HOD_BUDGET=true`, etc.
