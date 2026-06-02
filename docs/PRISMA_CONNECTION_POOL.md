# Prisma connection pool (PROMPT 6-B)

## Singleton

`lib/prisma/client.js` uses the global singleton pattern — one `basePrisma` per Node process (survives Next.js hot reload in dev).

## Neon `DATABASE_URL` (Vercel runtime)

Use Neon's **pooled** connection string for `DATABASE_URL` on Vercel. Append pool parameters as needed:

```
postgresql://USER:PASS@HOST/DB?sslmode=require&connection_limit=10&pool_timeout=20&connect_timeout=10
```

- **`connection_limit`**: cap per serverless function instance (start with **5–10** on Vercel; many concurrent instances multiply usage).
- **`DIRECT_URL`**: Neon **non-pooler** URL — use only for `prisma migrate deploy` / migrations, not runtime API traffic.

Neon documents compute and connection limits in the [Neon console](https://neon.tech); adjust `connection_limit` if you see pool exhaustion in logs or `/api/health` `dbPool: warn`.

## Prisma Accelerate (optional upgrade)

If `DATABASE_URL` does **not** start with `prisma://`, you can enable [Prisma Accelerate](https://www.prisma.io/accelerate) for managed pooling:

1. Create an Accelerate project in Prisma Data Platform.
2. `npx prisma generate --accelerate`
3. Set `DATABASE_URL` to the `prisma://` Accelerate URL in **Vercel** env vars.
4. Keep `DIRECT_URL` as the raw Neon Postgres URL for migrations (`prisma migrate deploy`).

Do not enable Accelerate until you are ready to change production env vars in Vercel.
