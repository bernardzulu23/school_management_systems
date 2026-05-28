# Prisma migration recovery (Neon)

## P3009 — failed migration blocks deploy

If you see:

```
Error: P3009
The `20260527120000_add_rag_models` migration ... failed
```

The database already had RAG tables (often from `prisma db push`). Clear the failed record, then deploy again:

```powershell
cd "F:\Mobile Apps\school_management_systems"

# Mark the failed migration as rolled back (does not change your tables)
npx prisma migrate resolve --rolled-back "20260527120000_add_rag_models"

# Re-apply (migration SQL is idempotent)
npx prisma migrate deploy
```

If **all** objects from that migration already exist and you only want to skip it:

```powershell
npx prisma migrate resolve --applied "20260527120000_add_rag_models"
npx prisma migrate deploy
```

## P1001 — can't reach database

- Check Neon project is **active** (not suspended).
- Use **direct** connection URL for migrations (`DIRECT_URL` or non-pooler `DATABASE_URL` in `.env`).
- `prisma.config.ts` prefers `DIRECT_URL` then `DATABASE_URL`.
- Allow your IP in Neon if IP allowlist is enabled.
- Retry: `npx prisma migrate deploy`

## P3018 — relation already exists

Same as P3009: use `migrate resolve --rolled-back` then `migrate deploy` after migrations use `IF NOT EXISTS`.

## Verify

```powershell
npx prisma migrate status
```
