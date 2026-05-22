# Cloudflare Workers deployment (deprecated)

> **This project now deploys to [Vercel + Neon](./VERCEL_DEPLOY.md).** The guide below is kept for reference only. Remove `wrangler` / OpenNext usage from your workflow.

Production stack (historical):

| Layer     | Service                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Database  | PostgreSQL (local Docker, or any hosted Postgres with a connection string)                                                        |
| App       | [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) |
| DNS / CDN | [Cloudflare](https://dash.cloudflare.com)                                                                                         |

---

## 1. Database

Use a Postgres URL for the app and a **direct** URL for Prisma migrations (`db push` / `migrate deploy`).

**Local (Docker):**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zsms?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/zsms?schema=public"
```

**Production:** set secrets in Cloudflare (see below). If your provider gives a pooled URL (host contains `-pooler`), use that for `DATABASE_URL` and the non-pooler host for `DIRECT_URL`.

Apply schema once from your machine or CI:

```bash
npm run prisma:generate
npm run prisma:db:push
```

---

## 2. Install & scripts

```bash
npm install
```

| Script            | Purpose                                |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Next.js local dev                      |
| `npm run build`   | `prisma generate` + `next build`       |
| `npm run preview` | OpenNext build + local Workers preview |
| `npm run deploy`  | OpenNext build + deploy to Cloudflare  |

---

## 3. Middleware / proxy (historical)

This project now uses **`proxy.js`** on Vercel (Next.js 16). The old Cloudflare + `middleware.js` guidance below is obsolete.

---

## 4. Wrangler auth & secrets

### Auth on Windows (SSL / `UNABLE_TO_VERIFY_LEAF_SIGNATURE`)

If `npx wrangler login` fails with `unable to verify the first certificate`, use an **API token** instead of OAuth (recommended):

1. Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token**
2. Use template **Edit Cloudflare Workers** (or custom: Account + Workers Scripts Edit)
3. In PowerShell:

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token-here"
npm run deploy
```

Or deploy only (after a successful `opennextjs-cloudflare build`):

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token-here"
npx opennextjs-cloudflare deploy
```

Optional (dev machine only, antivirus HTTPS inspection): fix npm/Node CA store rather than disabling TLS globally. As a last resort for OAuth login only:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
npx wrangler login
$env:NODE_TLS_REJECT_UNAUTHORIZED = ""
```

### Secrets

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put DIRECT_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
```

Also set in the Worker dashboard (or `.dev.vars` for local preview):

- `NEXT_PUBLIC_APP_ORIGIN`
- `NEXT_PUBLIC_APP_URL`
- `COOKIE_DOMAIN`
- `ALLOWED_ORIGIN_SUFFIXES` (e.g. `.bluepeacktechnologies.com,.workers.dev`)

---

## 5. Deploy

```bash
npm run deploy
```

Build only (no upload):

```bash
npx opennextjs-cloudflare build
```

Or connect the GitHub repo in **Workers & Pages** with build command `opennextjs-cloudflare build` and deploy via Wrangler / Workers CI (avoids local SSL issues).

### GitHub Actions (Linux build — recommended on Windows dev machines)

Workflow: `.github/workflows/deploy.yml` — runs on push to `main`.

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret                  | Required | Notes                                         |
| ----------------------- | -------- | --------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Yes      | API token with **Workers Scripts Edit**       |
| `CLOUDFLARE_ACCOUNT_ID` | Yes\*    | Account ID from Cloudflare dashboard URL      |
| `DATABASE_URL`          | Yes      | Neon pooled URL (for `prisma generate` in CI) |

\* Wrangler may infer the account from the token; set `CLOUDFLARE_ACCOUNT_ID` if deploy fails with “account” errors.

Runtime secrets (`JWT_SECRET`, `DIRECT_URL`, etc.) are **not** in the workflow — set once on the Worker:

```bash
npx wrangler secret put JWT_SECRET
```

---

## 6. Local OpenNext preview

Copy `.dev.vars.example` to `.dev.vars` and add your env vars, then:

```bash
npm run preview
```

---

## Troubleshooting

| Issue                                                             | Fix                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma migrate fails                                              | Use `DIRECT_URL` (non-pooled) for migrations; pooled `DATABASE_URL` at runtime                                                                                                                                                          |
| Build fails on CF                                                 | Run `npm run preview` locally first; fix TypeScript errors                                                                                                                                                                              |
| npm SSL on Windows                                                | See project `.npmrc` / use `legacy-peer-deps`                                                                                                                                                                                           |
| Wrangler OAuth SSL error                                          | Use `CLOUDFLARE_API_TOKEN` (see §4) or deploy via Cloudflare Git integration                                                                                                                                                            |
| `Node.js middleware not supported`                                | Use `middleware.js`, not `proxy.js`                                                                                                                                                                                                     |
| `Callback returned incorrect type; expected 'Promise'`            | Await Next.js 15+ dynamic APIs: `await params`, `await cookies()`, `await headers()`, `await searchParams` in server components and route handlers (sync access works locally but fails on Workers)                                     |
| Large Worker bundle / `prettier` in `.open-next/server-functions` | `open-next.config.ts` sets `default.minify: true`. Remove unused deps that pull Prettier (e.g. `@react-email/components` if you only use Resend + HTML strings). Keep `prettier` in `devDependencies` only. Rebuild: `npm run cf:build` |
