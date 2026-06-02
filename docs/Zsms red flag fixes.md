# ZSMS — Red Flag Resolution Prompt

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
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

Create a Node.js audit script at scripts/audit-tenant-isolation.ts that:

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

7. Add a package.json script: "audit:tenant": "npx ts-node scripts/audit-tenant-isolation.ts"

After creating the script, tell me the exact command to run it and what the
output format looks like.
```

---

### PROMPT 1-B — Prisma tenant extension

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

The project uses a single shared PrismaClient for all schools (multi-tenant
via subdomain, e.g. ndakedaysecondaryschool.bluepeacktechnologies.com).
The schoolId is stored in every school-scoped model.

Create the following files:

─────────────────────────────────────────────
FILE 1: lib/prisma/client.ts
─────────────────────────────────────────────
Export a singleton base PrismaClient called `basePrisma`. This is the unsafe
client — it has NO tenant scoping. It must only be used in:
  - Platform-level routes under app/platform/**
  - The school lookup during subdomain resolution
  - The audit script

─────────────────────────────────────────────
FILE 2: lib/prisma/tenantClient.ts
─────────────────────────────────────────────
Export a function `getTenantClient(schoolId: string)` that wraps basePrisma
with a Prisma Client Extension ($extends) and does the following:

For ALL query operations (findMany, findFirst, findUnique, update, updateMany,
delete, deleteMany, count):
  → Auto-inject `schoolId` into args.where, merging with any existing where.

For create / createMany:
  → Auto-inject `schoolId` into args.data (single object or array).

CRITICAL GUARD: The following models must be excluded from auto-injection
because they are platform-level and do NOT have a schoolId column:
  Province, District, Stream, PlatformAdmin, School, Plan, BillingInvoice,
  PilotNotification

Build the exclusion as a TypeScript Set<string> named PLATFORM_MODELS at
the top of the file so it is easy to add new entries.

If the model IS in PLATFORM_MODELS, pass the query through unmodified.

The function should be cheap to call (it creates an extension, not a new DB
connection). Add a JSDoc comment explaining this.

─────────────────────────────────────────────
FILE 3: lib/prisma/withTenant.ts
─────────────────────────────────────────────
Export an async helper `getSchoolId(request: NextRequest): Promise<string>`
that extracts the schoolId for the current request using this priority order:

  1. Parse the subdomain from request.headers.get('host'):
       host = "ndakedaysecondaryschool.bluepeacktechnologies.com"
       slug = "ndakedaysecondaryschool"
     Look up the school in the database using basePrisma:
       basePrisma.school.findFirst({ where: { subdomain: slug } })
     If found, return school.id.

  2. If the host is the apex domain (bluepeacktechnologies.com) or localhost,
     fall back to decoding the JWT from the HTTP-only cookie (cookie name:
     "auth_token" — check the existing auth middleware for the exact name).
     Return the schoolId claim from the decoded JWT payload.

  3. If neither resolves, throw a TenantResolutionError with message:
     "Unable to resolve school tenant from request."

Also export a convenience wrapper:
  `withTenantClient<T>(request: NextRequest, fn: (db: TenantClient) => Promise<T>): Promise<T>`
  that calls getSchoolId, builds the tenant client, and passes it to fn.
  On TenantResolutionError, return NextResponse.json({ error: "Unauthorized" }, { status: 401 }).

─────────────────────────────────────────────
After creating all three files, show me an example of how an existing API
route (pick app/api/assessments/route.ts or whichever exists) should be
refactored to use withTenantClient. Show the before and after diff.
─────────────────────────────────────────────
```

---

### PROMPT 1-C — Migrate the highest-risk routes

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

The lib/prisma/withTenantClient helper from the previous step is now in place.
You have also run the audit script and have tenant-audit-results.json.

Refactor the following route categories to use withTenantClient.
Work through them in this order (highest data sensitivity first):

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

Rules for each refactored route:
- Replace any direct `prisma.` call with the db parameter from withTenantClient.
- Remove any manual `where: { schoolId: ... }` clauses — the tenant client
  handles these automatically.
- Do NOT modify any routes under app/platform/** — those use basePrisma.
- If a route currently imports from lib/prisma (or wherever the old client
  lives), update that import.
- Preserve all existing business logic, HTTP status codes, and response shapes.

After each priority group, tell me which files were changed and run a TypeScript
type check (npx tsc --noEmit) to confirm no regressions.
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
  Goal: Allow legitimate QR scans but block scripted floods.
  A class of 50 students scanning within 2 minutes = ~25 req/min per IP max.

RULE 2 — Login brute-force protection
  Protect: URI path equals /api/auth/login (POST only)
  Goal: Stop credential stuffing. A real user retrying a wrong password
  needs at most 5 attempts before they reset their password.

RULE 3 — Password reset abuse
  Protect: URI path equals /api/auth/forgot-password (POST only)
  Goal: Stop email flooding. One person should never trigger more than
  3 reset emails per hour.

After the Cloudflare rules, also provide the curl commands I can use from
my local machine to verify each rule is working correctly against the
live domain.
```

---

### PROMPT 2-B — API middleware rate limiter (AI and general routes)

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

The project is deployed on Vercel with PostgreSQL on Neon.
We need rate limiting for API routes that require authentication,
particularly the AI endpoints under app/api/ai/**.

STEP 1 — Install dependencies
Show the exact pnpm install command for:
  @upstash/ratelimit
  @upstash/redis
Note: If the project does not already have an Upstash Redis instance, provide
instructions for creating a free Upstash Redis database and adding the two
required environment variables (UPSTASH_REDIS_REST_URL and
UPSTASH_REDIS_REST_TOKEN) to Vercel → Project → Settings → Environment Variables.

STEP 2 — Create lib/middleware/rateLimiter.ts
Create a module that exports a pre-configured rate limiter for each route
category. Use Upstash's slidingWindow algorithm for all limiters.

Define these four limiters:

  aiLimiter:
    20 requests per 60 seconds, keyed by userId (from JWT)
    This is a BURST limiter on top of the existing monthly checkAILimit.
    It prevents a script from burning the monthly quota in one minute.

  generalApiLimiter:
    100 requests per 60 seconds, keyed by schoolId + userId
    Applied to all authenticated API routes not covered by specific limiters.

  exportLimiter:
    10 requests per 300 seconds (5 min), keyed by userId
    Applied to heavy export routes: /api/teacher/results/export,
    /api/dashboard/headteacher/moe-reports/export (or similar export paths).

  qrAttendanceLimiter:
    30 requests per 60 seconds, keyed by IP address
    Applied to /api/attendance/qr-mark (the server-side QR handler).

Each limiter should return { success: boolean, limit: number, remaining: number, reset: number }.

STEP 3 — Create lib/middleware/withRateLimit.ts
Export a higher-order function:
  withRateLimit(limiter, keyFn, handler)
where:
  - limiter is one of the four limiters above
  - keyFn is (request: NextRequest) => string — how to derive the rate key
  - handler is the actual route handler

If the limit is exceeded, return:
  NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": reset.toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString()
      }
    }
  )

STEP 4 — Apply to AI routes
Wrap every route handler in app/api/ai/**/route.ts with withRateLimit using
aiLimiter. The key function should extract userId from the JWT cookie.
Show me the before and after for app/api/ai/lesson-planner/route.ts
(or whichever AI route exists) as a representative example.

STEP 5 — Apply to QR attendance
Wrap the POST handler in app/api/attendance/qr-mark/route.ts with
withRateLimit using qrAttendanceLimiter. The key function should use
request.headers.get('x-forwarded-for') ?? request.ip ?? 'unknown'.

After completing all steps, list every app/api/ai/** route file that
was modified so I can verify coverage.
```

---

## RED FLAG 3 — Monitoring and Alerting

**Risk level:** Operational blindness  
**Problem:** With real schools depending on this system for daily attendance,
timetables, and ECZ results, the first indication of a production failure must
not be a headteacher calling you. You need automated error capture, uptime
alerts, and slow query detection — before you onboard more schools.

**Fix strategy:** Sentry for error tracking (free tier covers the scale),
a robust health-check endpoint for uptime monitors, Prisma event-based slow
query logging, and a free UptimeRobot alert pointed at the health endpoint.

---

### PROMPT 3-A — Sentry integration

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

STEP 1 — Install Sentry
Run the Sentry Next.js wizard installation and show me the exact command.
If the wizard is not available in this environment, install manually:
  pnpm add @sentry/nextjs
Then create these four config files:

─────────────────────────────────────────────
sentry.client.config.ts  (browser-side)
─────────────────────────────────────────────
Configure with:
  - dsn: process.env.NEXT_PUBLIC_SENTRY_DSN
  - environment: process.env.NODE_ENV
  - tracesSampleRate: 0.1 in production, 1.0 in development
  - replaysOnErrorSampleRate: 1.0
  - replaysSessionSampleRate: 0.05
  - integrations: Sentry.replayIntegration()

─────────────────────────────────────────────
sentry.server.config.ts  (server-side)
─────────────────────────────────────────────
Configure with:
  - Same DSN and environment
  - tracesSampleRate: 0.1
  - Add a custom tag for "service": "zsms-api"
  - Enable Prisma tracing integration if available

─────────────────────────────────────────────
sentry.edge.config.ts  (middleware/edge runtime)
─────────────────────────────────────────────
Minimal config: DSN and environment only.

─────────────────────────────────────────────
instrumentation.ts  (Next.js 15 instrumentation hook)
─────────────────────────────────────────────
Import and initialise the correct Sentry config depending on runtime:
  - 'nodejs' runtime → sentry.server.config
  - 'edge' runtime → sentry.edge.config

STEP 2 — Enrich error context with tenant information
In lib/prisma/withTenant.ts (from Red Flag 1 fix), after resolving the
schoolId, add these two Sentry scope lines:
  Sentry.setTag('schoolId', schoolId);
  Sentry.setUser({ id: userId }); // if available from JWT

This ensures every error in Sentry is tagged with which school it came from,
making triage dramatically faster.

STEP 3 — Custom error boundary for the dashboard layouts
In app/dashboard/layout.tsx (or the closest shared layout), wrap children
with Sentry.ErrorBoundary using a fallback component that shows:
  - "Something went wrong. Our team has been notified."
  - A button that calls Sentry.showReportDialog() so users can optionally
    add context to the error report.

STEP 4 — Environment variables needed
List every environment variable required by this Sentry setup and confirm
which ones need the NEXT_PUBLIC_ prefix (browser-exposed) vs which are
server-only.

STEP 5 — Verify the integration
Show me how to trigger a test error from the Next.js server to confirm
Sentry is receiving events, without deploying to production.
```

---

### PROMPT 3-B — Health check endpoint

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

Create a production-grade health check endpoint at app/api/health/route.ts.

The endpoint must:

1. Accept GET requests with NO authentication required (it is called by
   external uptime monitors).

2. Run the following checks in parallel using Promise.allSettled:

   CHECK A — Database connectivity
     Execute: await basePrisma.$queryRaw`SELECT 1 AS ok`
     Pass condition: resolves without error
     Measure response time in milliseconds.

   CHECK B — Database connection pool
     Execute: await basePrisma.$queryRaw`SELECT count(*) FROM pg_stat_activity`
     Parse the count. Warn (but do not fail) if count > 80.

   CHECK C — Environment completeness
     Verify these environment variables are set (non-empty string):
       DATABASE_URL, GROQ_API_KEY, JWT_SECRET,
       NEXT_PUBLIC_SENTRY_DSN, UPSTASH_REDIS_REST_URL
     Fail if any are missing.

   CHECK D — Redis connectivity (if Upstash is configured)
     Attempt a Redis PING using the Upstash client.
     If UPSTASH_REDIS_REST_URL is not set, mark this check as "skipped".

3. Return HTTP 200 if all critical checks pass, HTTP 503 if any fail.
   Response body (JSON):
   {
     "status": "ok" | "degraded" | "down",
     "timestamp": "<ISO 8601>",
     "version": "<from package.json version field>",
     "checks": {
       "database": { "status": "ok" | "fail", "responseMs": 12 },
       "dbPool": { "status": "ok" | "warn", "connections": 14 },
       "environment": { "status": "ok" | "fail", "missing": [] },
       "redis": { "status": "ok" | "fail" | "skipped" }
     }
   }

4. Add a Cache-Control header: "no-store, no-cache" so uptime monitors
   never get a cached response.

5. Configure uptime monitoring (Vercel does not use a platform healthcheck file):
   - UptimeRobot or similar: HTTPS GET `https://www.bluepeacktechnologies.com/api/health`
   - Expect HTTP 200 and `"status": "ok"` in the JSON body
   - Optional liveness: `GET /api/health?live=1` (always 200, no DB)

After creating the file, show me the curl command to test it locally and
explain what a "degraded" vs "down" status means in terms of which checks
have failed.
```

---

### PROMPT 3-C — Slow query detection

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

STEP 1 — Add Prisma query event logging
In lib/prisma/client.ts (the basePrisma singleton from Red Flag 1),
add Prisma event-based logging:

  const basePrisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'warn',  emit: 'stdout' },
      { level: 'error', emit: 'stdout' }
    ]
  });

Then attach a query event handler that:
  - Measures query duration (already available in the event as `duration`)
  - If duration > 1000ms (1 second): log at WARN level and send to Sentry
    as a breadcrumb with the query string and duration.
  - If duration > 3000ms (3 seconds): capture a Sentry exception with
    title "Slow query detected" and attach the full query as context.
  - Never log query parameters in production (they may contain PII).
    Only log the query template string.

STEP 2 — Index reminder checklist
Do NOT run any migrations. Instead, produce a checklist file at
docs/database-index-checklist.md listing every Prisma model that
carries a schoolId field (scan schema.prisma to find them) and for each:
  - Confirm whether @@index([schoolId]) already exists in the schema.
  - If it does NOT exist, flag it as MISSING INDEX.
  - Also check for common foreign key fields (userId, classId, subjectId,
    studentId, teacherId) and flag any that are missing indexes.

Output the checklist as a markdown table with columns:
  Model | schoolId indexed | Other missing indexes

STEP 3 — Uptime monitoring instructions
Provide step-by-step instructions (no code, just configuration steps) for
setting up a free UptimeRobot monitor pointing at:
  https://www.bluepeacktechnologies.com/api/health
With:
  - Check interval: every 5 minutes
  - Alert contacts: email notification
  - Keyword monitoring: check that the response body contains "ok"
  - Alert when HTTP status is not 200

Also provide the equivalent setup for one subdomain example:
  https://ndakedaysecondaryschool.bluepeacktechnologies.com/api/health
```

---

## Final verification checklist

Run through this checklist after all three red flag fixes are deployed to staging.

### Tenant isolation verification

- [ ] `pnpm audit:tenant` reports zero VULNERABLE calls
- [ ] TypeScript check passes: `npx tsc --noEmit`
- [ ] Test: log in as a user from School A, call any student API, confirm you
      cannot retrieve School B student records even with a crafted `schoolId`
      query parameter
- [ ] Confirm all routes under `app/platform/**` still work (they use basePrisma)
- [ ] Confirm school registration / onboarding still works (uses basePrisma)

### Rate limiting verification

- [ ] Cloudflare rules are active (check Cloudflare dashboard → Security → Rate Limiting)
- [ ] `curl -X POST https://www.bluepeacktechnologies.com/api/auth/login` 6 times
      in rapid succession → 6th request returns HTTP 429
- [ ] `curl https://www.bluepeacktechnologies.com/attend` 31 times in 60 seconds
      → returns 429 after limit
- [ ] AI endpoint returns 429 after 20 rapid requests with a valid auth token
- [ ] All 429 responses include the `Retry-After` header

### Monitoring verification

- [ ] Trigger a deliberate server error: add `throw new Error("Sentry test")` to
      any API route, call it, confirm the event appears in the Sentry dashboard
      within 30 seconds, then remove the test error
- [ ] `curl https://www.bluepeacktechnologies.com/api/health` returns HTTP 200
      with `"status": "ok"` and all four checks passing
- [ ] UptimeRobot shows the monitor as "UP" with green status
- [ ] Simulate a DB outage (temporarily set a wrong DATABASE_URL in a local env)
      and confirm `/api/health` returns HTTP 503 with `"status": "down"`
- [ ] Slow query log fires when a query takes over 1000ms
      (test by adding `SELECT pg_sleep(1.5)` temporarily to the health check)

---

## Environment variables to add to Vercel

After completing all prompts, these new variables must be set in Vercel
(Project → Settings → Environment Variables):

| Variable                   | Where to get it             | Required by              |
| -------------------------- | --------------------------- | ------------------------ |
| `NEXT_PUBLIC_SENTRY_DSN`   | Sentry project settings     | Red Flag 3               |
| `SENTRY_AUTH_TOKEN`        | Sentry account → API tokens | Red Flag 3 (source maps) |
| `UPSTASH_REDIS_REST_URL`   | Upstash dashboard           | Red Flag 2               |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard           | Red Flag 2               |

The existing variables (`DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, etc.)
are unchanged.

---

_Document version: 1.0 — addresses Red Flags 1 (tenant isolation),
2 (rate limiting), and 3 (monitoring) from the ZSMS architecture review,
May 2026._
