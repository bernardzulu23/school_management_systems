# Vercel + Neon deployment

Production stack:

| Layer    | Service                                                                  |
| -------- | ------------------------------------------------------------------------ |
| Database | [Neon](https://neon.tech) PostgreSQL (serverless, pooled + direct URLs)  |
| App      | [Vercel](https://vercel.com) — Next.js 16 (Node.js serverless functions) |
| DNS      | Vercel custom domain + school subdomains (e.g. `stmarys.yourdomain.com`) |

---

## 1. Neon database

### 1.1 Create project

1. [Neon Console](https://console.neon.tech) → **New Project**
2. Copy connection strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL` (runtime / Prisma app)
   - **Direct** (non-pooler) → `DIRECT_URL` (migrations only)

Example:

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

### 1.2 Apply schema

From your machine (with `DIRECT_URL` in `.env`):

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
# or: npm run prisma:db:push
```

Vercel does **not** run migrations on every deploy by default. Options:

- Run migrations in **GitHub Actions** (see `.github/workflows/deploy.yml`)
- Run manually before/after deploy
- Use Neon/Vercel integration and a one-off `vercel env pull` + local migrate

---

## 2. Vercel project setup

### 2.1 Import repository

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Import this GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `npm run build` (runs `prisma generate && next build`)
5. Install command: `npm ci --ignore-scripts` (see `vercel.json`)

### 2.2 Neon ↔ Vercel integration (recommended)

1. Vercel project → **Storage** → **Connect** → **Neon**
2. Vercel injects env vars (often `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, etc.)
3. Map them in Vercel **Settings → Environment Variables**:

| Vercel / Neon variable              | Map to         | Use                             |
| ----------------------------------- | -------------- | ------------------------------- |
| Pooled URL (`*-pooler` or `PRISMA`) | `DATABASE_URL` | Runtime (Prisma + Neon adapter) |
| Direct / non-pooling URL            | `DIRECT_URL`   | Migrations / `prisma db push`   |

Our `package.json` migrate scripts already fall back across `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`.

### 2.3 Required environment variables

Set for **Production** (and Preview if needed):

| Variable                  | Required | Notes                                         |
| ------------------------- | -------- | --------------------------------------------- |
| `DATABASE_URL`            | Yes      | Neon **pooled** connection string             |
| `DIRECT_URL`              | Yes      | Neon **direct** string for migrations         |
| `JWT_SECRET`              | Yes      | Min 32 chars                                  |
| `JWT_REFRESH_SECRET`      | Yes      | Min 32 chars                                  |
| `NEXT_PUBLIC_APP_ORIGIN`  | Yes      | e.g. `https://bluepeacktechnologies.com`      |
| `NEXT_PUBLIC_APP_URL`     | Yes      | Same as origin                                |
| `COOKIE_DOMAIN`           | Prod     | e.g. `.bluepeacktechnologies.com`             |
| `ALLOWED_ORIGIN_SUFFIXES` | Prod     | e.g. `.bluepeacktechnologies.com,.vercel.app` |
| `RESEND_API_KEY`          | If email | Password reset / onboarding                   |
| `EMAIL_FROM`              | If email | Verified sender in Resend                     |

Optional: `ENFORCE_PRODUCTION_SECRETS=true`, Lipila/SMS keys, Sentry, etc. (see `.env.example`).

---

## 3. Custom domain & subdomains

1. Vercel → **Domains** → add apex (`bluepeacktechnologies.com`) and wildcard `*.bluepeacktechnologies.com` if you use per-school subdomains.
2. Point DNS at Vercel (nameservers or CNAME per Vercel instructions).
3. Set `COOKIE_DOMAIN=.yourdomain.com` so auth cookies work across subdomains.
4. `middleware.js` resolves school from hostname; preview URLs (`*.vercel.app`) skip subdomain tenancy.

---

## 4. Local development

```bash
cp .env.example .env
# Use Neon dev branch URLs or local Docker Postgres
npm install
npm run prisma:generate
npm run dev
```

Mobile app (`zsms-mobile`): set `EXPO_PUBLIC_API_BASE_URL` to your Vercel URL or `http://10.0.2.2:3000` (Android emulator).

---

## 5. Deploy

**Git push (recommended):** connect repo in Vercel; every push to `main` deploys production.

Confirm the deployment commit is **not** an old hash (e.g. `2f68430`). In Vercel → Deployments, the latest build should match `git log -1` on `main`.

**CLI (optional):**

```bash
npx vercel          # preview
npx vercel --prod   # production
```

If the CLI fails on Windows with `unable to verify the first certificate`, use **Git-connected auto-deploy** instead, or fix your machine’s TLS/CA store (corporate antivirus often causes this). Do not rely on disabling TLS verification in production scripts.

**Next.js 16:** use root `proxy.js` (not `middleware.js`). The build runs `next build --webpack` via `scripts/vercel-build.js`.

---

## 6. Prisma on Vercel

- Runtime uses `@prisma/adapter-neon` in `lib/prisma.ts` with `DATABASE_URL` (pooled).
- `prisma generate` runs in `npm run build`.
- Do not rely on `server.js` on Vercel — Vercel runs the Next.js output directly.

---

## 7. Troubleshooting

| Issue                                       | Fix                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Can't reach database` at runtime           | Use **pooled** `DATABASE_URL`; check `sslmode=require`                                                                                 |
| Migrate fails on CI/Vercel                  | Use `DIRECT_URL` (non-pooler) for `prisma migrate deploy`                                                                              |
| Auth cookies not shared on subdomains       | Set `COOKIE_DOMAIN` with leading dot                                                                                                   |
| `ERR_NAME_NOT_RESOLVED` on school login     | Add Vercel domain `*.yourdomain.com` **and** DNS wildcard `*` CNAME → Vercel; apex alone is not enough                                 |
| Login works on apex but not `school.domain` | Wildcard DNS missing; interim: `https://yourdomain.com/login?subdomain=schoolslug`                                                     |
| Build OOM                                   | Already skipping TS in build via `next.config.js`; run `npm run lint` locally                                                          |
| `write EPIPE` during `next build`           | Project uses `next build --webpack` (see `scripts/vercel-build.js`). Push latest `main` — old Cloudflare lockfiles cause huge installs |
| `eslint` invalid in `next.config.js`        | Removed in Next.js 16 — lint via `npm run lint` only                                                                                   |
| `husky` during Vercel install               | `installCommand` uses `--ignore-scripts`; set `HUSKY=0` in Vercel (see `vercel.json`)                                                  |
| `prisma: command not found`                 | `prisma` is in `dependencies`; build runs `npx prisma generate`. `NPM_CONFIG_PRODUCTION=false` in `vercel.json` installs dev tools     |
| Wrong public URL in emails                  | Set `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` is used as fallback in `next.config.js`                                                       |

---

## 8. Deprecated: Cloudflare Workers

OpenNext / Wrangler deployment is **no longer supported** for this project. See archived notes in [LEGACY_MISC_ARCHIVE.md](./LEGACY_MISC_ARCHIVE.md).
