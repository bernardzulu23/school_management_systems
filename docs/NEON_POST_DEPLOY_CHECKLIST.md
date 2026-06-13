# Neon post-deploy checklist (ZSMS)

Use the **Neon Postgres** Cursor plugin (MCP server `neon`) after deploys or when debugging `database: false` in `/api/health`.

**Neon project:** `school-management-system` (`flat-haze-98569249`, `eu-west-2`)

## Branch map (as of 2026-06-05 audit)

| Branch                                           | ID                           | Endpoint host (pooled)                | Status                                     |
| ------------------------------------------------ | ---------------------------- | ------------------------------------- | ------------------------------------------ |
| **import-2026-05-19** (operational / live data)  | `br-holy-butterfly-abbbphno` | `ep-red-dawn-abn43kbe-pooler`         | 101 public tables, 11 schools              |
| **production** (Neon default — empty app schema) | `br-muddy-voice-abf1si7l`    | `ep-ancient-mountain-abuub3my-pooler` | `neon_auth` only — do **not** use for ZSMS |
| **zsms-backup-2026-06-05** (snapshot)            | `br-blue-sound-ab94nvmh`     | fork of import                        | safety copy before env alignment           |

Both `DATABASE_URL` and `DIRECT_URL` must target the **import** branch endpoints (`ep-red-dawn-abn43kbe`). A split config (pooled on `production`, direct on `import`) causes runtime queries to fail while migrations succeed.

Console: [school-management-system branches](https://console.neon.tech/app/projects/flat-haze-98569249)

---

## 1. Confirm env targets the live branch

**Local:** `.env.local` pooled host must contain `ep-red-dawn-abn43kbe-pooler`; direct host `ep-red-dawn-abn43kbe` (no `-pooler`).

**Vercel:** Project → Settings → Environment Variables. Update `DATABASE_URL` and `DIRECT_URL` to the import branch connection strings from Neon (or re-link the Neon integration and map pooled → `DATABASE_URL`, direct → `DIRECT_URL`).  
If `DATABASE_URL` contains `ep-ancient-mountain-abuub3my`, production is pointed at the empty default branch.

---

## 2. Neon MCP sanity checks (ask Cursor)

Run these via the Neon plugin after each deploy or schema change:

### Table count

```
get_database_tables
  projectId: flat-haze-98569249
  branchId: br-holy-butterfly-abbbphno
```

**Pass:** 100+ tables in `public` schema (`School`, `User`, `Student`, …).  
**Fail:** Only `neon_auth.*` tables → wrong branch in env vars.

### Migration state

```
run_sql
  projectId: flat-haze-98569249
  branchId: br-holy-butterfly-abbbphno
  sql: SELECT migration_name, finished_at FROM _prisma_migrations
       WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 5;
```

**Pass:** Latest repo migration under `prisma/migrations/` appears with a `finished_at` timestamp.  
**Fail:** Missing `_prisma_migrations` or pending migrations → run `npx prisma migrate deploy` against `DIRECT_URL`.  
**Local P1001 / network block:** paste and run `scripts/manual_neon_result_type_migration.sql` in the Neon SQL Editor (import branch), then re-check migration state.

### Row-count spot check

```
run_sql
  sql: SELECT
         (SELECT COUNT(*) FROM "School") AS schools,
         (SELECT COUNT(*) FROM "User") AS users,
         (SELECT COUNT(*) FROM "Student") AS students;
```

**Pass:** Non-zero counts in environments that should have seed/pilot data.

### Optional: slow queries

```
list_slow_queries
  projectId: flat-haze-98569249
  branchId: br-holy-butterfly-abbbphno
```

Review after attendance, timetable, or RAG load increases.

---

## 3. App health check

```bash
curl http://localhost:3000/api/health
# or production URL
```

**Pass:** `"checks": { "database": { "status": "ok" } }`

---

## 4. Safe schema changes (ongoing)

For new Prisma migrations:

1. `prepare_database_migration` — applies DDL on a temporary Neon branch
2. Verify with `run_sql` / `describe_table_schema` on the temp branch
3. `complete_database_migration` — commit to the operational branch after approval
4. Re-run section 2 checks

---

## 5. Future: align Neon default branch name

The Neon default branch `production` does not hold ZSMS data. Longer-term options:

- Promote import data to `production` via [Neon console](https://console.neon.tech) branch restore, or
- Rename branches for clarity and protect `import-2026-05-19` / operational branch

Until then, always verify endpoint hostnames, not branch display names.
