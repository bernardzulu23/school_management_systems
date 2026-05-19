# Neon + Cloudflare Deployment Guide

Production stack for ZSMS:

| Layer           | Service                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Database        | [Neon](https://neon.tech) PostgreSQL                                                                                |
| App hosting     | [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [OpenNext](https://opennext.js.org/cloudflare) |
| DNS / CDN / WAF | [Cloudflare](https://dash.cloudflare.com)                                                                           |

Render and Railway hosting configs have been removed from this repo.

---

## 1. Neon database

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. Copy two connection strings from the Neon dashboard:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL` (runtime / Prisma in the app)
   - **Direct** (no pooler) → `DIRECT_URL` (migrations only)

Example `.env` (production secrets go in Cloudflare, not git):

```env
DATABASE_URL="postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
```

3. Apply schema (local machine, once):

```bash
npx prisma db push
# or
npm run prisma:migrate:deploy
```

4. Seed as needed:

```bash
npm run seed:platform-admin
npm run seed:schools
```

---

## 2. Cloudflare Workers (app)

### Prerequisites

- Cloudflare account
- `npx wrangler login`
- Node 20+

### Install OpenNext (one-time in repo)

```bash
npm install --save-dev @opennextjs/cloudflare wrangler
```

### Build & deploy

```bash
npm run cf:build
npm run cf:deploy
```

Or connect the GitHub repo in **Workers & Pages** → **Create** → **Workers** → import repo, with:

| Setting        | Value                 |
| -------------- | --------------------- |
| Build command  | `npm run cf:build`    |
| Deploy command | `npx wrangler deploy` |

### Required secrets (Wrangler / Cloudflare dashboard)

Set in **Workers** → your worker → **Settings** → **Variables**:

| Variable                  | Notes                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`            | Neon **pooled** URL                                                  |
| `DIRECT_URL`              | Neon **direct** URL (optional at runtime; used for migrations in CI) |
| `JWT_SECRET`              | 32+ random chars                                                     |
| `JWT_REFRESH_SECRET`      | 32+ random chars                                                     |
| `NEXT_PUBLIC_APP_ORIGIN`  | `https://bluepeacktechnologies.com`                                  |
| `NEXT_PUBLIC_APP_URL`     | Same as origin                                                       |
| `COOKIE_DOMAIN`           | `.bluepeacktechnologies.com`                                         |
| `ALLOWED_ORIGIN_SUFFIXES` | `.bluepeacktechnologies.com,.pages.dev,.workers.dev`                 |

---

## 3. Cloudflare DNS (custom domain)

1. Add site **bluepeacktechnologies.com** to Cloudflare.
2. Point wildcard for school subdomains:
   - **Type**: `CNAME`
   - **Name**: `*` (or each school subdomain)
   - **Target**: your Workers custom domain / route target from the Workers dashboard
   - **Proxy**: Proxied (orange cloud)
3. **SSL/TLS** → **Full (strict)**.

School URLs: `https://{subdomain}.bluepeacktechnologies.com`

---

## 4. Local development

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zsms"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/zsms"
NEXT_PUBLIC_APP_ORIGIN="http://localhost:3000"
```

```bash
npm install
npm run dev
```

---

## 5. Migrate from Render

1. Export data from Render Postgres (`pg_dump`) or use Neon **Import**.
2. Update `DATABASE_URL` / `DIRECT_URL` everywhere (Cloudflare secrets, local `.env`).
3. Remove old Render service and Postgres after verification.
4. Redeploy Cloudflare Worker so env vars refresh.

---

## Troubleshooting

### npm: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

Common on Windows with antivirus HTTPS scanning or corporate proxy. Try **one** of these in PowerShell (project folder):

```powershell
# Option A — use Node’s bundled CA store (preferred)
npm config set cafile ""
npm config delete cafile

# Option B — temporary (dev machine only)
npm config set strict-ssl false
npm install
npm config set strict-ssl true
```

Then install dependencies:

```powershell
npm install
```

This repo includes `.npmrc` with `legacy-peer-deps=true` so React 19 + Excalidraw peer warnings do not block installs.

### npm: `ERESOLVE` / peer dependency conflicts

Do **not** run bare `npm install @neondatabase/serverless` unless you need to add a package. From the project root:

```powershell
npm install
```

Packages are already listed in `package.json`. Use `--legacy-peer-deps` only if you removed `.npmrc`.

### Neon CLI

There is no `neontl` package. Use the [Neon console](https://console.neon.tech) for connection strings, or:

```powershell
npx neonctl@latest --help
```

(Requires working npm registry access.)

### Other issues

| Issue                   | Fix                                                            |
| ----------------------- | -------------------------------------------------------------- |
| Prisma can't connect    | Use **pooled** URL at runtime; **direct** for `prisma migrate` |
| 403 on API from browser | Set `ALLOWED_ORIGIN_SUFFIXES` and `COOKIE_DOMAIN`              |
| Subdomain login fails   | DNS `*` CNAME to Workers; check `x-school-subdomain` in proxy  |
| Build fails on CF       | Run `npm run cf:build` locally first; fix TypeScript errors    |
