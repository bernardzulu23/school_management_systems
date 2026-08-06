# Neon database roles (least privilege)

Runtime Prisma should **not** use the Neon project owner / `neondb_owner` role.

## Recommended roles

| Role           | Used for                                             | Privileges                                                                                       |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `zsms_migrate` | `DIRECT_URL`, `prisma migrate deploy` (CI / one-off) | DDL on app schema; can own tables                                                                |
| `zsms_app`     | `DATABASE_URL` (Vercel Production + Preview pooled)  | DML only: `SELECT/INSERT/UPDATE/DELETE` on app tables; `USAGE` on schema; **no** `CREATE`/`DROP` |

## Setup sketch (Neon SQL editor as owner)

```sql
-- Create roles (use strong passwords; store only in Vercel env)
CREATE ROLE zsms_migrate LOGIN PASSWORD '...';
CREATE ROLE zsms_app LOGIN PASSWORD '...';

GRANT CONNECT ON DATABASE neondb TO zsms_migrate, zsms_app;
GRANT USAGE ON SCHEMA public TO zsms_migrate, zsms_app;

-- After migrations (owner still owns tables), grant DML to app:
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zsms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zsms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zsms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO zsms_app;

-- Optional: revoke dangerous defaults from PUBLIC
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

Point connection strings:

- `DATABASE_URL` → pooled (`-pooler`) as `zsms_app`
- `DIRECT_URL` → direct as `zsms_migrate` (migrations / `db push` only)

## Vercel scoping

| Variable                            | Production                              | Preview                                   | Development |
| ----------------------------------- | --------------------------------------- | ----------------------------------------- | ----------- |
| `DATABASE_URL`                      | prod branch `zsms_app`                  | preview/branch DB or isolated Neon branch | local       |
| `DIRECT_URL`                        | prod migrate role (CI only if possible) | preview migrate                           | local       |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | **unique** prod values                  | **different** preview values              | local       |
| AT / Lipila / QStash / Resend       | prod keys                               | sandbox / separate keys                   | local       |

Do **not** mark secrets as “Sensitive” and then also expose them with `NEXT_PUBLIC_`.  
Do **not** share Production JWT/DB secrets with Preview.

## Verify

```bash
# As zsms_app — should fail:
psql "$DATABASE_URL" -c 'CREATE TABLE _privilege_probe(id int);'
# As zsms_app — should succeed:
psql "$DATABASE_URL" -c 'SELECT 1 FROM "School" LIMIT 1;'
```

If `CREATE` succeeds on `DATABASE_URL`, you are still on an owner-class role — rotate.
