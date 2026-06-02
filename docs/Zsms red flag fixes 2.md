# ZSMS — Red Flag Resolution Prompt

> **Canonical copy:** This file is kept in sync with [`Zsms red flag fixes.md`](./Zsms%20red%20flag%20fixes.md). Prefer either; content should match.

**Project:** Zambian School Management System (`school_management_systems`)  
**Stack:** Next.js 16 App Router · TypeScript · PostgreSQL (Neon) · Prisma · Vercel · Cloudflare WAF  
**Scope:** Three critical production vulnerabilities identified in architecture review  
**Use this file as:** A direct instruction set for Claude Code or your own implementation sprint

---

## Implementation status (May 2026)

| Red flag                 | Status  | Notes                                                                                                                                                                                                                                      |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — Tenant isolation** | Partial | `npm run audit:tenant` → `scripts/tenant-audit-results.json`. `getTenantClient` migrated on all `app/api/student/**`, `app/api/assessments/route.js`, `app/api/students/route.js`, `app/api/subjects`. Remaining routes: use audit output. |
| **2 — Rate limiting**    | Partial | Upstash limiters in `lib/middleware/upstashLimiters.js` + `withAILimits` on all `app/api/ai/**` POST routes (no-op without `UPSTASH_REDIS_*`). Proxy + LRU limits unchanged. Cloudflare: `docs/CLOUDFLARE_RATE_LIMITING.md`.               |
| **3 — Monitoring**       | Partial | Sentry + `service: zsms-api` tag, dashboard `ErrorBoundary` with report dialog. `/api/health` for UptimeRobot/Vercel monitors (DB, pool, env, optional Redis). Prisma slow-query breadcrumb at 1s + Sentry message at 3s.                  |

**Commands:** `npm run audit:tenant` · `node scripts/generate-db-index-checklist.mjs`

**Deploy:** App on **Vercel**, database on **Neon** — see `docs/ENVIRONMENT.md` and `docs/doc/VERCEL_DEPLOY.md`.

---

## How to use this prompt

Copy each section labelled **"PROMPT"** and paste it into Claude Code
(or your terminal session) one section at a time, in order. Each section is
self-contained and produces a testable output before you move to the next.
Do **not** skip sections — they build on each other.

---

## RED FLAG 1 — Tenant Isolation

**Risk level:** Critical data breach  
**Problem:** The phrase "almost all APIs have schoolId" means at least one
route leaks data across school boundaries. With 265+ routes, manual auditing
is unreliable. A single missing `where: { schoolId }` clause exposes every
student, teacher, and result record on the platform to any authenticated user
from any other school.

**Fix strategy:** Two-part. First, run an automated audit to find every
vulnerable route right now. Second, implement a Prisma extension that
auto-injects `schoolId` at the query layer so no individual developer can
forget it again.

---

### PROMPT 1-A — Audit script (run this first, before touching any code)

```
You are working inside the Next.js 16 App Router project at
F:\Mobile Apps\school_management_systems.

Create a Node.js audit script at scripts/audit-tenant-isolation.mjs that:

1. Recursively scans every file matching app/api/**/route.ts and
   app/api/**/route.js.

2. For each file, extracts every Prisma query call. Specifically, look for
   any of these method calls:
     .findMany(  .findFirst(  .findUnique(  .update(  .updateMany(
     .delete(  .deleteMany(  .count(  .create(  .createMany(  .upsert(

3. For each Prisma call found, checks whether the string "schoolId" appears
   within the same query block (i.e., within the matching braces that follow
   the method call). A "query block" ends at the matching closing parenthesis.

4. If a Prisma call is found WITHOUT schoolId in its block, log it as
   VULNERABLE with the file path, line number, model name (parsed from the
   prisma.ModelName pattern), and the method name.

5. If a Prisma call is found WITH schoolId, log it as OK.

6. At the end, print a summary:
     Total routes scanned: N
     Vulnerable calls found: N
     Safe calls found: N

   And write the full vulnerable list to scripts/tenant-audit-results.json.

7. Add a package.json script: "audit:tenant": "node scripts/audit-tenant-isolation.mjs"

After creating the script, tell me the exact command to run it and what the
output format looks like.
```

---

### PROMPT 1-B — Prisma tenant extension

```
You are working inside the Next.js 16 App Router project at
F:\Mobile Apps\school_management_systems.

The project uses a single shared PrismaClient for all schools (multi-tenant
via subdomain, e.g. ndakedaysecondaryschool.bluepeacktechnologies.com).
The schoolId is stored in every school-scoped model.

Create the following files:

─────────────────────────────────────────────
FILE 1: lib/prisma/client.js
─────────────────────────────────────────────
Export a singleton base PrismaClient called `basePrisma`. This is the unsafe
client — it has NO tenant scoping. It must only be used in:
  - Platform-level routes under app/platform/**
  - The school lookup during subdomain resolution
  - The audit script and health checks

─────────────────────────────────────────────
FILE 2: lib/prisma/tenantClient.js
─────────────────────────────────────────────
Export a function `getTenantClient(schoolId: string)` that wraps basePrisma
with a Prisma Client Extension ($extends) and does the following:

For ALL query operations (findMany, findFirst, findUnique, update, updateMany,
delete, deleteMany, count):
  → Auto-inject `schoolId` into args.where, merging with any existing where.

For create / createMany:
  → Auto-inject `schoolId` into args.data (single object or array).

CRITICAL GUARD: Platform models (School, PlatformAdmin, etc.) must be excluded
from auto-injection. Build PLATFORM_MODELS as a Set at the top of the file.

─────────────────────────────────────────────
FILE 3: lib/prisma/withTenant.js
─────────────────────────────────────────────
Export `withTenantClient(request, fn)` that resolves schoolId (subdomain or JWT)
and passes a tenant-scoped client to fn.

After creating all three files, show a before/after refactor of one API route.
─────────────────────────────────────────────
```

---

### PROMPT 1-C — Migrate the highest-risk routes

```
You are working inside the Next.js 16 App Router project at
F:\Mobile Apps\school_management_systems.

The lib/prisma/withTenant.js helper and getTenantClient are in place.
You have also run: npm run audit:tenant

Refactor the following route categories to use getTenantClient(schoolId)
after resolveAuthenticatedSchoolId (or withTenantClient). Work in order:

Priority 1 — student data (do these first):
  app/api/student/**
  app/api/students/**

Priority 2 — assessment and results:
  app/api/assessments/**
  app/api/ecz/**
  app/api/student/results/**
  app/api/teacher/results/**

Priority 3 — attendance:
  app/api/attendance/**
  app/api/mobile/attendance/**

Priority 4 — all remaining app/api/** routes NOT under app/platform/**

Rules:
- Replace direct prisma calls with the tenant client for school-scoped data.
- Do NOT modify app/platform/** routes (basePrisma).
- Preserve response shapes and status codes.

After each priority group, list changed files and run tests.
```

---

## RED FLAG 2 — Rate Limiting

**Risk level:** High — denial of service, credential stuffing, AI cost abuse  
**Problem:** Three surfaces are completely unprotected:

- `/attend` — public QR page, no auth, can be spammed indefinitely
- `/api/auth/login` — no brute-force protection on password attempts
- `/api/ai/*` — quota logic (`checkAILimit`) controls monthly caps but not
  burst abuse; a script can exhaust a school's AI quota in minutes

**Fix strategy:** Layered approach. Cloudflare rate limiting rules for the
public and auth surfaces (zero extra infrastructure). Upstash Redis sliding
window for the AI routes (gives you per-user burst control on top of the
existing monthly quota).

---

### PROMPT 2-A — Cloudflare rate limiting rules

```
You are helping configure Cloudflare Rate Limiting for the domain
bluepeacktechnologies.com and all subdomains (*.bluepeacktechnologies.com).
The project is a Next.js school management system deployed on Vercel with PostgreSQL on Neon.

Do NOT write any code. Instead, provide exact step-by-step instructions for
configuring the following three Cloudflare Rate Limiting rules through the
Cloudflare dashboard. For each rule, specify:
  - Rule name
  - The exact "If incoming requests match" condition
  - The rate (requests per period)
  - The period (seconds)
  - The action (Block / Challenge / JS Challenge)
  - The response code and message to return
  - Whether to count by IP or IP + path

RULE 1 — Public attendance endpoint
  Protect: URI path equals /attend (GET and POST)

RULE 2 — Login brute-force protection
  Protect: URI path equals /api/auth/login (POST only)

RULE 3 — Password reset abuse
  Protect: URI path equals /api/auth/forgot-password (POST only)

After the Cloudflare rules, provide curl commands to verify against the live domain.
```

---

### PROMPT 2-B — API middleware rate limiter (AI and general routes)

```
You are working inside the Next.js 16 App Router project at
F:\Mobile Apps\school_management_systems.

The project is deployed on Vercel with PostgreSQL on Neon.
We need rate limiting for API routes that require authentication,
particularly the AI endpoints under app/api/ai/**.

STEP 1 — Install dependencies
  npm install @upstash/ratelimit @upstash/redis

Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to
Vercel → Project → Settings → Environment Variables.

STEP 2 — Create lib/middleware/upstashLimiters.js (ai, general, export, qr limiters)

STEP 3 — Create lib/middleware/withRateLimit.js and withAILimits.js

STEP 4 — Wrap every app/api/ai/** POST handler with withAILimits

STEP 5 — Apply qrAttendanceLimiter to POST /api/attendance/qr-mark

List every modified AI route file when done.
```

---

## RED FLAG 3 — Monitoring and Alerting

**Risk level:** Operational blindness  
**Fix strategy:** Sentry, `/api/health` for UptimeRobot, Prisma slow-query logging.

---

### PROMPT 3-A — Sentry integration

```
Sentry is already integrated (@sentry/nextjs, instrumentation.js).

Verify/enhance:
  - sentry.server.config.ts / sentry.edge.config.ts with service tag zsms-api
  - Dashboard ErrorBoundary with Sentry.captureException + showReportDialog
  - Tenant tags in withTenant.js (schoolId, userId)

See lib/sentry/options.js for shared config.
```

---

### PROMPT 3-B — Health check endpoint

```
Production health check: GET /api/health (implemented in app/api/health/route.js).

Parallel checks: database, pool warn, env, optional Upstash Redis.
Returns ok | degraded | down; 503 when critical checks fail.

Uptime monitoring (Vercel has no platform healthcheck file):
  - UptimeRobot: HTTPS GET https://www.bluepeacktechnologies.com/api/health
  - Optional liveness: GET /api/health?live=1

See docs/ENVIRONMENT.md for response shape.
```

---

### PROMPT 3-C — Slow query detection

```
Implemented in lib/prisma/client.js:
  - Breadcrumb at ≥1s, Sentry message at ≥3s
  - docs/database-index-checklist.md from scripts/generate-db-index-checklist.mjs

Set PRISMA_SLOW_QUERY_LOG=1 in development for console warnings.
```

---

## Final verification checklist

Run through this checklist after all three red flag fixes are deployed to staging.

### Tenant isolation verification

- [ ] `npm run audit:tenant` reports zero VULNERABLE calls (or only known false positives)
- [ ] Cross-tenant access test: School A user cannot read School B records
- [ ] `app/platform/**` and onboarding still work (basePrisma)

### Rate limiting verification

- [ ] Cloudflare rules active (see `docs/CLOUDFLARE_RATE_LIMITING.md`)
- [ ] Login / attend / AI burst limits return 429 with `Retry-After`
- [ ] Upstash env set in Vercel for distributed AI limits

### Monitoring verification

- [ ] Sentry receives a test exception from staging
- [ ] `curl https://www.bluepeacktechnologies.com/api/health` → `"status": "ok"`
- [ ] UptimeRobot monitor UP
- [ ] Wrong `DATABASE_URL` locally → health returns `"status": "down"`

---

## Environment variables to add to Vercel

After completing all prompts, set these in **Vercel → Project → Settings → Environment Variables**:

| Variable                   | Where to get it                 | Required by                |
| -------------------------- | ------------------------------- | -------------------------- |
| `DATABASE_URL`             | Neon → pooled connection string | Runtime (already required) |
| `DIRECT_URL`               | Neon → direct URL               | Migrations                 |
| `NEXT_PUBLIC_SENTRY_DSN`   | Sentry project settings         | Red Flag 3                 |
| `SENTRY_AUTH_TOKEN`        | Sentry → API tokens             | Source maps (CI/Vercel)    |
| `UPSTASH_REDIS_REST_URL`   | Upstash dashboard               | Red Flag 2 (burst limits)  |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard               | Red Flag 2                 |

Existing variables (`JWT_SECRET`, `GROQ_API_KEY`, `RESEND_API_KEY`, etc.) are unchanged.
See `docs/ENVIRONMENT.md` for the full list.

---

_Document version: 1.1 — Red Flags 1–3; stack Vercel + Neon; synced with `Zsms red flag fixes.md`, May 2026._
