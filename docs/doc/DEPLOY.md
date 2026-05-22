# Deployment

**Current stack:** [Neon](https://neon.tech) PostgreSQL + [Vercel](https://vercel.com) (Next.js).

See **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)** for the full guide.

Quick reference:

```bash
npm run build          # prisma generate + next build (same as Vercel)
npm run prisma:migrate:deploy   # against Neon DIRECT_URL
```

Deprecated: [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) (Workers / OpenNext — no longer used).
