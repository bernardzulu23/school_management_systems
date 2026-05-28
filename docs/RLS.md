# Row-Level Security (RLS) — Phase 3 P3.1

ZSMS can enforce multi-tenant isolation at the PostgreSQL layer on Neon.

## Migration

Apply `prisma/migrations/20260528120000_enable_rls/migration.sql` after deploying Prisma `TermReport` schema.

Tables with RLS:

- `Student`
- `Attendance`
- `Result`
- `EczAssessmentScore`
- `TermReport`

Policies compare `schoolId` to session variable `app.current_school_id`.

## Application usage

Use `withSchoolContext` from `lib/db/school-context.js` for tenant-scoped work inside a transaction:

```javascript
import { withSchoolContext } from '@/lib/db/school-context'

const rows = await withSchoolContext(schoolId, (tx) => tx.student.findMany({ where: { classId } }))
```

Without setting the variable, RLS-enabled roles see **no rows** (fail closed).

## Rollout

1. Deploy app code with `withSchoolContext` on sensitive paths first (optional).
2. Run migration on staging; verify headteacher can still load their school.
3. Gradually wrap high-risk queries (exports, admin tools) in `withSchoolContext`.
4. Production: enable migration during low traffic; monitor 403/empty-list errors.

## Bypass

Migrations and platform jobs should use a database role that bypasses RLS, or run with `SET app.current_school_id` per school in batch jobs.
