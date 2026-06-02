# ZSMS — Red Flag Resolution Prompt

**Project:** Zambian School Management System (`school_management_systems`)  
**Stack:** Next.js 15 App Router · TypeScript · PostgreSQL (Neon) · Prisma · Vercel · Cloudflare WAF  
**Scope:** Three critical production vulnerabilities identified in architecture review  
**Use this file as:** A direct instruction set for Claude Code or your own implementation sprint

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

---

# ZSMS — Amber Flag & Hardening Prompt (Part 2)

**Project:** Zambian School Management System (`school_management_systems`)  
**Stack:** Next.js 15 App Router · TypeScript · PostgreSQL (Neon) · Prisma · Vercel · Cloudflare WAF  
**Scope:** Amber flags, immediate branding fix, caching, schema health, AI vendor
abstraction, and Innovation Hub gating — all issues from the architecture review
that are not critical data breaches but will cause production pain as you scale.  
**Prerequisite:** Complete Part 1 (red flag fixes) before starting this document.

---

## How to use this document

Same pattern as Part 1. Each section has a **PROMPT** block you paste into
Claude Code one at a time. Sections are ordered by urgency — start at the
top and work down. Do not run a prompt before the one before it is verified.

### Implementation status (June 2026)

| Prompt               | Status  | Notes                                                                                                                                           |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** Meta tags      | Done    | `app/layout.js`, `app/dashboard/layout.js`, `robots.txt`, `sitemap.xml`, branding strings                                                       |
| **4-A** HOD audit    | Done    | `docs/hod-api-audit.md`                                                                                                                         |
| **4-B** HOD gates    | Done    | `lib/featureFlags.js`, `ComingSoon`, all 7 HOD mock pages gated                                                                                 |
| **5** Redirects      | Done    | Removed 3 redirect-only pages; `docs/redirect-inventory.md`                                                                                     |
| **6-A** Caching      | Partial | `lib/cache/*`; wired `GET /api/subjects`, published branch of `GET /api/timetable/view`; `revalidateTag` on subject mutations                   |
| **6-B** Pool docs    | Done    | `docs/PRISMA_CONNECTION_POOL.md`                                                                                                                |
| **7** AI abstraction | Partial | `lib/ai/index.js` + Groq provider; `withAILimits` on AI routes; individual routes still call legacy Groq helpers until migrated to `complete()` |
| **8** Innovation Hub | Done    | Beta badges, sandbox guards, PhET iframe attrs                                                                                                  |
| **9** Mobile scope   | Done    | `docs/mobile-app-scope.md`, mobile banner, teacher download card                                                                                |

---

## IMMEDIATE FIX — Branding & SEO meta tags

**Risk level:** Live right now, visible to every visitor and every Google crawl  
**Problem:** The deployed site at `bluepeacktechnologies.com` returns Open Graph
and Twitter meta tags that reference `zambianschool.com` and `EduZambia`.
This breaks link previews on WhatsApp, Facebook, and LinkedIn for every school
that shares the platform URL — a trust and branding problem on day one.

---

### PROMPT 0 — Fix meta tags across the entire Next.js app

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

The deployed site currently has wrong Open Graph and Twitter meta tags.
The live site returns:
  og:url       = "https://zambianschool.com"        ← WRONG
  og:site_name = "EduZambia"                        ← WRONG
  og:image     = "https://zambianschool.com/og-image.jpg"  ← WRONG
  twitter:image = "https://zambianschool.com/twitter-image.jpg" ← WRONG

Fix ALL of the following, in this order:

STEP 1 — Locate every place these wrong values appear
Search the entire project for the strings:
  "zambianschool.com"
  "EduZambia"
List every file and line number found.

STEP 2 — Update app/layout.tsx (or app/layout.js) root metadata
Replace the export const metadata (or generateMetadata) with correct values:

  title: "Zambian School Management System | Blue Peak Technologies"
  description: "The complete school management platform for Zambian primary
    and secondary schools. ECZ SBA, CBC curriculum, attendance, timetables,
    and AI tools — built for Zambia."
  metadataBase: new URL("https://www.bluepeacktechnologies.com")
  openGraph: {
    type: "website",
    locale: "en_ZM",
    url: "https://www.bluepeacktechnologies.com",
    siteName: "Blue Peak Technologies — ZSMS",
    title: "Zambian School Management System",
    description: (same as above),
    images: [
      {
        url: "/og-image.jpg",   ← relative, metadataBase handles the domain
        width: 1200,
        height: 630,
        alt: "ZSMS — Zambian School Management System"
      }
    ]
  }
  twitter: {
    card: "summary_large_image",
    title: "Zambian School Management System",
    description: (same as above),
    images: ["/og-image.jpg"]
  }

IMPORTANT: Use a relative URL for all image paths (starting with /).
Next.js metadataBase will prepend the correct domain automatically.
This also means that on school subdomains (e.g., ndakedaysecondaryschool.
bluepeacktechnologies.com), the og:url will resolve to the correct subdomain.
Do not hardcode the full domain in image URLs.

STEP 3 — School subdomain metadata override
For any layout under app/dashboard/ that is school-specific, check if there
is a generateMetadata function. If there is, ensure it overrides:
  - og:url to the current school's subdomain URL
  - og:title to include the school name
  - og:site_name to remain "Blue Peak Technologies — ZSMS"

If no such override exists yet, create a generateMetadata stub in
app/dashboard/layout.tsx that reads the subdomain from headers() and
constructs the correct URL. Leave title and description as-is for now —
just fix the URL and site_name.

STEP 4 — OG image asset
Check whether /public/og-image.jpg exists.
If it does NOT exist:
  - Create a placeholder at public/og-image.jpg (any valid JPEG, even 1×1)
    and note that a proper 1200×630 branded image should replace it before
    the next marketing push.
If it DOES exist:
  - Confirm its dimensions are at least 1200×630 by running:
    file public/og-image.jpg
    and if dimensions are wrong, note it as a design task.

STEP 5 — Verify
After making all changes, run:
  curl -s https://www.bluepeacktechnologies.com | grep -i "og:"
Show me the expected correct output that curl should return after deployment.

Also show me what the WhatsApp/Facebook link preview will display with the
corrected tags (title, description, image, domain) so I can confirm it
matches the brand.
```

---

## AMBER FLAG 4 — HOD Department File Pages (Partial APIs)

**Risk level:** School trust / data integrity  
**Problem:** Seven HOD pages are explicitly flagged in the architecture document
as potentially backed by sample data or incomplete APIs: `budget`,
`correspondence`, `meetings`, `minutes`, `stock-book`, `staff-meetings`,
and `daily-routine`. If a real HOD opens these pages during a school's
first week and sees demo/fake data, or submits something that silently disappears,
that school will lose confidence in the entire platform. These pages must either
work completely or be clearly gated as "coming soon."

---

### PROMPT 4-A — Audit HOD department file page API coverage

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

Audit the following HOD page files and their corresponding API routes.
For each page, determine whether its data operations are backed by a real
PostgreSQL-persisted API or are using mock/sample/hardcoded data.

Pages to audit:
  app/dashboard/hod/budget/page.js
  app/dashboard/hod/correspondence/page.js
  app/dashboard/hod/meetings/page.js
  app/dashboard/hod/minutes/page.js
  app/dashboard/hod/stock-book/page.js
  app/dashboard/hod/staff-meetings/page.js
  app/dashboard/hod/daily-routine/page.js

For each page file:

1. Open the file and identify every fetch() call, API route reference, or
   data source. List the exact API paths called (e.g., /api/hod/budget).

2. For each API path found, check whether the corresponding route file exists
   under app/api/**. If it does NOT exist, mark as "NO API — mock data only".

3. If the route file exists, open it and check:
   a. Does it query the Prisma database (look for prisma. calls)?
   b. Does it return hardcoded / sample JSON (look for return Response.json
      with literal objects)?
   c. Does it have a Prisma model in schema.prisma? Search for the model name.
   Mark as "REAL API", "PARTIAL API", or "MOCK ONLY" accordingly.

4. Produce a summary table:

   | HOD Page        | API path         | Status       | Prisma model? |
   |-----------------|------------------|--------------|---------------|
   | budget          | /api/hod/budget  | MOCK ONLY    | No            |
   | ...             | ...              | ...          | ...           |

5. After the table, list the pages that are MOCK ONLY or PARTIAL API — these
   are candidates for feature-flag gating in the next prompt.

Do not make any code changes in this prompt. Audit and report only.
```

---

### PROMPT 4-B — Feature-flag gate all incomplete HOD pages

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

You have the audit results from the previous prompt identifying which HOD
department file pages are backed by mock/partial data.

Implement a feature-flag gating system for these incomplete pages.

STEP 1 — Create lib/featureFlags.ts
Export a typed constant FEATURE_FLAGS:

  export const FEATURE_FLAGS = {
    HOD_BUDGET:           false,   // toggle to true when API is complete
    HOD_CORRESPONDENCE:   false,
    HOD_MEETINGS:         false,
    HOD_MINUTES:          false,
    HOD_STOCK_BOOK:       false,
    HOD_STAFF_MEETINGS:   false,
    HOD_DAILY_ROUTINE:    false,
    // Add future flags here
  } as const;

  export type FeatureFlag = keyof typeof FEATURE_FLAGS;

  export function isEnabled(flag: FeatureFlag): boolean {
    // Also allow environment variable overrides:
    // FEATURE_FLAG_HOD_BUDGET=true in Vercel enables it without a redeploy
    const envKey = `FEATURE_FLAG_${flag}`;
    if (process.env[envKey] === 'true') return true;
    if (process.env[envKey] === 'false') return false;
    return FEATURE_FLAGS[flag];
  }

STEP 2 — Create components/ui/ComingSoon.tsx
A clean "coming soon" UI component that accepts:
  props: { featureName: string; expectedTerm?: string }

Renders a centered card with:
  - A construction/clock icon (use an SVG inline, no external libraries)
  - Title: "{featureName}"
  - Body: "This feature is being finalised for the next term.
           Contact Blue Peak Technologies if you need this urgently."
  - If expectedTerm is provided, show: "Expected: {expectedTerm}"
  - A mailto link: "Contact Support" → mailto:support@bluepeacktechnologies.com
  - Styling: use Tailwind classes consistent with the existing dashboard UI
    (check one of the working HOD pages for the card/container class patterns
    already in use)

STEP 3 — Gate each incomplete page
For EVERY page identified as MOCK ONLY or PARTIAL API in the audit:

At the top of the page component (server component — no 'use client' needed):

  import { isEnabled } from '@/lib/featureFlags';
  import { ComingSoon } from '@/components/ui/ComingSoon';

  // At the start of the page function:
  if (!isEnabled('HOD_BUDGET')) {   // use the appropriate flag name
    return <ComingSoon featureName="Department Budget" expectedTerm="Term 3, 2026" />;
  }

Apply this pattern to every incomplete page. Do NOT remove the existing page
content below the gate — keep it in place for when the flag is enabled.

STEP 4 — Remove incomplete pages from the HOD sidebar
In components/dashboard/Sidebar.js (or wherever the HOD sidebar nav items
are defined), wrap any navigation link pointing to a gated page with a
conditional check:

  import { isEnabled } from '@/lib/featureFlags';

  // Only show the link if the feature is enabled:
  {isEnabled('HOD_BUDGET') && (
    <SidebarLink href="/dashboard/hod/budget" label="Department Budget" />
  )}

If the sidebar is rendered server-side, this works as a direct import.
If it is a client component, pass the feature flags as props from a server
wrapper.

STEP 5 — Confirm
After all changes, list the gated pages and confirm that navigating to
/dashboard/hod/budget (for example) now shows the ComingSoon component
instead of the incomplete UI.
```

---

## AMBER FLAG 5 — Routing Inconsistencies

**Risk level:** Maintenance debt and tracing difficulty  
**Problem:** Several redirect chains exist with no documented reason. Unexplained
redirects are bugs you cannot trace. They also inflate your route handler count,
confuse Next.js prefetching, and create ambiguous canonical URLs that hurt SEO.

**Known duplicates from the architecture review:**

- `/dashboard/teacher/attendance` → `/dashboard/attendance` (redundant redirect)
- `/dashboard/timetable/hod` → `/dashboard/hod/timetable` (why does the first route exist?)
- `/dashboard/timetable/master` → `/dashboard/headteacher/timetable` (same question)
- `/dashboard/admin` → `/dashboard/headteacher` (legacy path surviving)

---

### PROMPT 5 — Audit and clean redirect chains

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

STEP 1 — Map all redirects
Search the entire app/ directory for:
  a. Files that contain ONLY a redirect (e.g., redirect(), NextResponse.redirect(),
     or permanentRedirect() with no other logic).
  b. Files in app/**/page.js or app/**/page.tsx whose entire body is a redirect.
  c. Any next.config.js / next.config.ts redirects array entries.

For each redirect found, record:
  - Source path
  - Destination path
  - Whether any UI content exists in the file beyond the redirect
  - Whether the source path appears in any sidebar navigation, link, or
    other page in the project (grep for the source path string)

Output a redirect inventory table:
  | Source | Destination | Used in nav/links? | Reason known? |

STEP 2 — Categorise each redirect
For each entry in the table, decide:

  KEEP — The source path is referenced in external links, emails, SMS, or QR
          codes that cannot be updated. The redirect protects backward compat.

  REMOVE — The source path is only referenced internally (sidebars, Link
            components). We can update those references and delete the route file.

  DOCUMENT — Keep the redirect but add a JSDoc comment in the file explaining
              exactly why it exists.

For the known problematic ones, here is the expected categorisation:
  /dashboard/teacher/attendance     → REMOVE (update sidebar link directly)
  /dashboard/timetable/hod          → REMOVE (update sidebar link)
  /dashboard/timetable/master       → REMOVE (update sidebar link)
  /dashboard/admin                  → DOCUMENT (may be in old bookmarks or emails)

STEP 3 — Execute removals
For each redirect marked REMOVE:
  a. Delete the route file (the page.js with only a redirect in it).
  b. Search the entire project for any Link href, router.push(), or anchor
     tag pointing to the source path.
  c. Update every reference to point to the canonical destination path directly.
  d. Confirm with grep that the old source path no longer appears anywhere in
     the codebase except possibly in comments.

STEP 4 — Document survivors
For each redirect marked DOCUMENT or KEEP, open the route file and add
a comment block at the top:

  /**
   * REDIRECT ROUTE — DO NOT DELETE
   * Reason: [explain why this backward-compat redirect is needed]
   * Referenced by: [e.g., "QR codes printed on 2025 student cards"]
   * Review date: Term 1 2027 — consider whether this is still needed.
   */

STEP 5 — Update next.config.ts redirects (if applicable)
If any removed routes were also listed in the next.config redirects array,
remove them from there too. Show the before and after of next.config.ts.

After completing all steps, show me the final redirect inventory with
REMOVED, DOCUMENTED, or KEPT status for each entry.
```

---

## AMBER FLAG 6 — Caching Layer

**Risk level:** Performance degradation at scale  
**Problem:** High-read, rarely-changing data (published timetables, subject lists,
school configuration, ECZ constructs) currently hits PostgreSQL on every request.
At 7am when 500 students load their timetable simultaneously, this creates an
unnecessary database spike. Neon's PostgreSQL has connection limits — you will
hit them before you hit your user limits. Next.js 15 App Router has multiple
caching mechanisms built in; none of them appear to be in use.

---

### PROMPT 6-A — Next.js unstable_cache for high-read data

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

Implement Next.js 15 unstable_cache (from 'next/cache') for the four
highest-read, lowest-change data categories. For each, create a cached
data-access function and integrate it into the relevant API routes or
server components.

─────────────────────────────────────────────
CACHE 1 — Published timetable
─────────────────────────────────────────────
Create lib/cache/timetable.ts

Export:
  getCachedPublishedTimetable(schoolId: string, role: 'student' | 'teacher' | 'hod')

Implementation:
  - Wrap the existing timetable fetch logic (or the equivalent of what
    GET /api/timetable/view does) in unstable_cache.
  - Cache key: ['timetable', schoolId, role]
  - Cache tags: ['timetable', `timetable-${schoolId}`]
  - Revalidate: 3600 seconds (1 hour)
    Timetables are published by the headteacher — they don't change mid-day.

Cache invalidation:
  In app/api/timetable/publish/route.ts, after the publish transaction
  completes successfully, call:
    revalidateTag(`timetable-${schoolId}`)
  This instantly clears the cache for that school only when the HT publishes.
  Import revalidateTag from 'next/cache'.

─────────────────────────────────────────────
CACHE 2 — Subject catalogue
─────────────────────────────────────────────
Create lib/cache/subjects.ts

Export:
  getCachedSubjects(schoolId: string)

Implementation:
  - Fetch all subjects for the school from Prisma (using getTenantClient).
  - Cache key: ['subjects', schoolId]
  - Cache tags: ['subjects', `subjects-${schoolId}`]
  - Revalidate: 86400 seconds (24 hours)
    Subjects are updated once per term at most.

Cache invalidation:
  In any route that creates, updates, or deletes a subject, call:
    revalidateTag(`subjects-${schoolId}`)

─────────────────────────────────────────────
CACHE 3 — School configuration
─────────────────────────────────────────────
Create lib/cache/schoolConfig.ts

Export:
  getCachedSchoolConfig(schoolId: string)

This should return the school record including: name, subdomain, plan,
logo, term dates, active year — the data that nearly every page needs
to render its header.

  - Cache key: ['school-config', schoolId]
  - Cache tags: ['school-config', `school-config-${schoolId}`]
  - Revalidate: 3600 seconds

Cache invalidation:
  In any admin route that updates school settings, call:
    revalidateTag(`school-config-${schoolId}`)

─────────────────────────────────────────────
CACHE 4 — ECZ constructs and rubrics
─────────────────────────────────────────────
Create lib/cache/eczConfig.ts

Export:
  getCachedEczConstructs(schoolId: string, subjectId: string)

  - Cache key: ['ecz-constructs', schoolId, subjectId]
  - Cache tags: ['ecz-constructs', `ecz-${schoolId}`]
  - Revalidate: 86400 seconds (24 hours)
    ECZ constructs change only when the curriculum changes — not during term.

─────────────────────────────────────────────
INTEGRATION
─────────────────────────────────────────────
After creating the four cache modules:

1. Replace direct Prisma calls in the following API routes with the cached
   versions (identify the exact prisma. call being replaced in each):
     app/api/timetable/view/route.ts
     app/api/subjects/route.ts  (GET handler only, not POST/PATCH/DELETE)
     app/dashboard/layout.tsx or wherever school config is fetched

2. Do NOT cache write operations (POST, PATCH, DELETE) — only GET/read paths.

3. After integration, show me the cache hit/miss behaviour by adding a
   console.log("[CACHE HIT]") inside the cached function and
   console.log("[CACHE MISS]") at the point where Prisma is actually queried.
   (These can be removed after verification.)
```

---

### PROMPT 6-B — Database connection pool configuration

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

The project uses Prisma with PostgreSQL on Neon. Next.js serverless on Vercel
function execution can create many short-lived Prisma client instances,
exhausting PostgreSQL's connection limit (Neon pooler + per-instance `connection_limit`; see `docs/PRISMA_CONNECTION_POOL.md`).

STEP 1 — Audit current Prisma client instantiation
Search the entire project for:
  new PrismaClient(
List every file where this appears. There should be exactly ONE — in
lib/prisma/client.ts (from the Red Flag 1 fix). If there are others,
flag them as bugs (each one is a potential connection leak).

STEP 2 — Configure connection pool
In lib/prisma/client.ts, update the PrismaClient instantiation to configure
the connection pool via the DATABASE_URL datasource param. Add
?connection_limit=10&pool_timeout=20 to the DATABASE_URL if it is not already
present, OR configure it at the Prisma level:

  const basePrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: [
      { level: 'warn',  emit: 'stdout' },
      { level: 'error', emit: 'stdout' }
    ]
  });

Then in Vercel → Project → Settings → Environment Variables, update `DATABASE_URL` to
include: ?connection_limit=10&pool_timeout=20&connect_timeout=10
Show me the exact format of the updated DATABASE_URL.

STEP 3 — Global singleton guard
Ensure the Prisma client uses the global singleton pattern to survive
Next.js hot module reloads in development without leaking connections:

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  export const basePrisma = globalForPrisma.prisma || new PrismaClient({ ... });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

If this pattern is already present (from the Red Flag 1 work), confirm it
and skip this step.

STEP 4 — Prisma Accelerate recommendation
Check if the project's DATABASE_URL already uses Prisma Accelerate
(url starts with "prisma://"). If NOT, note that Prisma Accelerate's
built-in connection pooling would be a zero-config upgrade path that
eliminates connection exhaustion entirely. Provide the steps to enable it:
  a. Run: npx prisma generate --accelerate
  b. Replace DATABASE_URL with DIRECT_URL (raw PG) and DATABASE_URL (prisma://)
  c. Import from @prisma/extension-accelerate
Do NOT implement this automatically — just document the option for a
planned upgrade.
```

---

## AMBER FLAG 7 — AI Vendor Abstraction (Groq Single Point of Failure)

**Risk level:** Feature outage during Groq incidents  
**Problem:** All AI features call Groq directly. A Groq outage, API key rotation,
rate limit hit, or pricing change disables the AI lesson planner, quiz maker,
flashcards, ECZ practice, and study assistant simultaneously. An abstraction
layer costs one day to build and saves many hours of emergency patching later.

---

### PROMPT 7 — AI provider abstraction layer

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

All AI inference currently calls Groq directly in each api/ai/** route.
Build a thin provider abstraction so you can swap or add providers without
touching individual feature routes.

STEP 1 — Create lib/ai/provider.ts

Define the interface:

  export interface AICompletionRequest {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'text' | 'json';
  }

  export interface AICompletionResponse {
    text: string;
    provider: string;    // which provider actually served this request
    modelUsed: string;
    tokensUsed?: number;
  }

  export interface AIProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  }

STEP 2 — Create lib/ai/providers/groq.ts
Implement the Groq provider using the existing Groq SDK (check which package
is currently installed — likely 'groq-sdk'). Wrap the existing call pattern
already in use in app/api/ai/lesson-planner/route.ts (or whichever AI route
exists as the reference implementation).

  isAvailable(): check that process.env.GROQ_API_KEY is set and non-empty.
  complete(): call the Groq API with the configured model
    (read model from process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile')

STEP 3 — Create lib/ai/providers/openai.ts (stub)
Create a stub OpenAI provider that:
  - Returns false from isAvailable() (disabled by default)
  - Throws a clear error from complete() if called
  This exists purely so the interface is ready to be activated if Groq goes down.

  To activate it later, a developer only needs to:
    1. pnpm add openai
    2. Set OPENAI_API_KEY in Vercel
    3. Change isAvailable() to check for the key

STEP 4 — Create lib/ai/index.ts (the resolver)
Export a single function:
  async function getAIProvider(): Promise<AIProvider>

Logic:
  1. Check if Groq is available → return GroqProvider
  2. Check if OpenAI stub is available → return OpenAIProvider
  3. Throw AIUnavailableError with message:
     "No AI provider is configured. Set GROQ_API_KEY in environment variables."

Also export a convenience function:
  async function complete(request: AICompletionRequest): Promise<AICompletionResponse>
  that calls getAIProvider() then provider.complete(request).

STEP 5 — Migrate all AI routes to use the abstraction
Find all files under app/api/ai/**. For each route that calls Groq directly:
  - Replace the direct Groq SDK call with: import { complete } from '@/lib/ai'
  - Pass the existing system prompt and user prompt into the AICompletionRequest.
  - Use response.text where the raw Groq text was previously used.

Show me the before and after for app/api/ai/lesson-planner/route.ts as the
reference example, then list every other ai/ route that was updated.

STEP 6 — Error handling upgrade
In the complete() function in lib/ai/index.ts, wrap provider.complete() in
try/catch and:
  - If the provider throws, log the error to Sentry (captureException).
  - Add the provider name and model as Sentry tags.
  - Re-throw as a typed AICompletionError so callers can detect it.

In each API route, catch AICompletionError specifically and return:
  NextResponse.json(
    { error: "AI service is temporarily unavailable. Please try again in a moment." },
    { status: 503 }
  )
This gives users a clear message instead of an unhandled 500.
```

---

## AMBER FLAG 8 — Innovation Hub — Beta Gating & Sandbox Security

**Risk level:** Support burden + security surface  
**Problem:** The Innovation Hub contains a code playground (with server-side
execution), a PhET virtual lab (external iframe), a digital music composer,
and 3D shape tools. Each is a separate maintenance surface. PhET iframe
breakages, code sandbox escapes, and unsupported browsers will generate
support tickets. These features need explicit beta labels and sandboxing.

---

### PROMPT 8 — Innovation Hub hardening

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

The Innovation Hub at /dashboard/innovation exposes several advanced features
that need hardening before wider school rollout.

STEP 1 — Label all Innovation Hub features as beta in the UI
In app/dashboard/innovation/page.js and in any InnovationHub component that
renders the feature grid:

  a. Add a "BETA" badge (a small coloured pill, e.g., amber background, white
     text reading "Beta") to the corner of every feature card EXCEPT:
       - ECZ Practice (this is production-ready and core to the platform)
       - AI Lesson Planner (same — production-ready)
     All other Innovation Hub features get the Beta badge.

  b. Add a one-line disclaimer below the feature grid:
     "Beta features are actively developed. Report issues to
      support@bluepeacktechnologies.com."

  c. Wrap the entire innovation hub section in an isEnabled check:
     if (!isEnabled('INNOVATION_HUB')) → show a simpler placeholder.
     Add INNOVATION_HUB: true to FEATURE_FLAGS in lib/featureFlags.ts
     (default true — it is already live — but now you can turn it off per
     environment if needed).

STEP 2 — Code playground sandbox audit
Open app/dashboard/student/code-playground/page.js and the corresponding
server execution route (look for the API route that runs submitted code —
check for routes referencing 'exec', 'run', or 'playground' under app/api/).

For the server-side code execution route:
  a. Confirm whether submitted code runs directly with Node.js eval() or
     child_process. If it does, this is a critical security issue — flag it
     immediately and do NOT proceed with other steps until this is addressed.
     A school student could execute: require('child_process').exec('rm -rf /')

  b. If the code execution is already sandboxed (e.g., using vm2, isolated-vm,
     or running in a Docker container), document the sandbox mechanism with a
     comment block in the route file.

  c. If execution is NOT sandboxed, implement the following emergency guard
     immediately:
     - Add a denylist of dangerous patterns BEFORE any execution:
         const DANGEROUS_PATTERNS = [
           /require\s*\(/,
           /process\./,
           /child_process/,
           /__dirname/,
           /fs\./,
           /eval\s*\(/,
           /Function\s*\(/,
           /import\s*\(/,
         ];
         const isDangerous = DANGEROUS_PATTERNS.some(p => p.test(submittedCode));
         if (isDangerous) {
           return NextResponse.json(
             { error: "This code contains restricted operations." },
             { status: 400 }
           );
         }
     - Add a time limit: abort execution after 3000ms.
     - Add a memory limit using Node.js --max-old-space-size if running
       in a worker.
     Note: These are emergency guards only. The real fix is replacing
     direct execution with a sandboxed worker (e.g., isolated-vm or a
     dedicated execution microservice). Flag this as a TECH DEBT item.

STEP 3 — PhET iframe Content Security Policy
In next.config.ts, add a Content Security Policy header that allows the
PhET embed origin but restricts everything else:

  async headers() {
    return [
      {
        source: '/dashboard/student/virtual-lab',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://phet.colorado.edu; default-src 'self';"
          }
        ]
      }
    ]
  }

Also in app/dashboard/student/virtual-lab/page.js, ensure the <iframe> tag
that embeds PhET has these attributes:
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="no-referrer"
  loading="lazy"
  title="PhET Virtual Science Laboratory"

Add an error boundary around the iframe so if PhET's CDN is unreachable,
the user sees a friendly message instead of a broken frame:
  "Virtual lab is temporarily unavailable. Try again or use the offline
   worksheets linked below."

STEP 4 — School-level feature toggle
Verify that the CreativeFeature model (from app/api/creative-features route)
allows per-school feature enable/disable. If it does:
  - Add an admin UI note in the headteacher dashboard explaining that
    Innovation Hub features can be enabled/disabled per school under Settings.
If it does NOT support per-school control yet:
  - Add a schoolId-scoped enabled boolean to the CreativeFeature model and
    expose a PATCH /api/creative-features/[featureId] route that only the
    headteacher role can call.
```

---

## AMBER FLAG 9 — Mobile App Scope Clarity

**Risk level:** Support confusion and feature gap complaints  
**Problem:** The Expo teacher app covers 20 screens focused on attendance and
face enrollment. The web app has 127 pages. As you onboard schools, teachers
will ask "why can't I do X on the app?" without a clear answer. This is a
communication and UX problem that generates unnecessary support load.

---

### PROMPT 9 — Mobile app scope documentation and in-app messaging

```
You are working inside the Next.js 15 App Router project at
F:\Mobile Apps\school_management_systems.

Also reference the zsms-mobile Expo project (check the monorepo for its
location — typically a mobile/ or zsms-mobile/ directory).

STEP 1 — Map the 20 mobile screens
List every screen in the Expo project. For each screen, note:
  - Screen name / route
  - Primary function
  - Whether it has a corresponding web route

Output a table:
  | Mobile screen        | Function          | Web equivalent |
  |----------------------|-------------------|----------------|
  | AttendanceScreen     | Mark attendance   | /dashboard/attendance |
  | ...                  | ...               | ...            |

STEP 2 — Add "Use the web app for..." message in the mobile app
In the mobile app's main tab navigator or home screen, add a persistent
informational banner (not a modal — it should not block interaction):

  Text: "Full features including timetables, lesson plans, and results
         are available on the web dashboard."
  Link: Opens the school's subdomain URL in the device browser.

The banner should be dismissible (store dismissal in AsyncStorage so it
doesn't reappear every session).

STEP 3 — In-web cross-link to mobile app
In the web teacher dashboard (app/dashboard/teacher/page.js), add a
"Download the Teacher App" card in the quick-actions section:

  Title: "Take attendance on the go"
  Body: "Download the ZSMS Teacher App for fast mobile attendance marking."
  Buttons:
    - "App Store" → (your iOS store link, or placeholder if not published)
    - "Play Store" → (your Android store link, or placeholder if not published)
  Note: Wrap this card in a feature flag MOBILE_APP_DOWNLOAD: true so you
  can disable it until the app is published on the stores.

STEP 4 — Create docs/mobile-app-scope.md
Write a one-page internal document that defines:
  - What the mobile app DOES: attendance marking, session management,
    attendance history, face enrollment
  - What the mobile app DOES NOT do (and why): lesson plans, timetable
    management, results entry, billing — these require a full keyboard/screen
    environment and are web-only by design
  - Roadmap placeholder: "Phase 3 may add timetable viewing and push
    notifications for assessment reminders"

This document is for your support team and school onboarding materials —
not for code. Write it in plain language that a non-technical headteacher
would understand.
```

---

## Final amber flag verification checklist

Run this after all amber flag prompts are complete.

### Branding

- [ ] `curl -s https://www.bluepeacktechnologies.com | grep og:url` returns the correct domain
- [ ] Share the URL on WhatsApp and confirm the preview shows the right title and image

### HOD page gating

- [ ] Navigate to `/dashboard/hod/budget` as a HOD — confirm ComingSoon renders
- [ ] Set `FEATURE_FLAG_HOD_BUDGET=true` in local env and reload — confirm the original page renders
- [ ] Gated pages do NOT appear in the HOD sidebar

### Routing

- [ ] `grep -r "/dashboard/timetable/hod" app/` returns zero results (removed)
- [ ] `grep -r "/dashboard/admin\"" app/` returns only the documented redirect file
- [ ] All previously broken link paths now redirect or resolve correctly

### Caching

- [ ] Load `/api/timetable/view` twice — second request logs `[CACHE HIT]`
- [ ] Headteacher publishes a new timetable — next student load logs `[CACHE MISS]` (tag revalidated)
- [ ] Connection pool: `pg_stat_activity` shows fewer than 15 connections under normal load

### AI abstraction

- [ ] Remove `GROQ_API_KEY` from local env temporarily — AI routes return 503 with the "temporarily unavailable" message (not an unhandled 500)
- [ ] Restore key — AI routes work normally
- [ ] All AI routes import from `@/lib/ai` — none import groq-sdk directly

### Innovation Hub

- [ ] Beta badges are visible on all non-core Innovation Hub features
- [ ] Code playground rejects `require('fs')` with a 400 error
- [ ] PhET virtual lab iframe has `sandbox` and `referrerpolicy` attributes
- [ ] PhET iframe shows friendly fallback if the network blocks the CDN

---

## Master environment variable list (Parts 1 + 2 combined)

Add all of these to Vercel → Project → Settings → Environment Variables before production:

| Variable                           | Purpose                    | Required by  |
| ---------------------------------- | -------------------------- | ------------ |
| `NEXT_PUBLIC_SENTRY_DSN`           | Browser error tracking     | Red Flag 3   |
| `SENTRY_AUTH_TOKEN`                | Source map upload          | Red Flag 3   |
| `UPSTASH_REDIS_REST_URL`           | Rate limiting              | Red Flag 2   |
| `UPSTASH_REDIS_REST_TOKEN`         | Rate limiting              | Red Flag 2   |
| `GROQ_API_KEY`                     | AI inference (existing)    | Amber Flag 7 |
| `GROQ_MODEL`                       | AI model override          | Amber Flag 7 |
| `FEATURE_FLAG_HOD_BUDGET`          | HOD page gate override     | Amber Flag 4 |
| `FEATURE_FLAG_INNOVATION_HUB`      | Innovation Hub kill switch | Amber Flag 8 |
| `FEATURE_FLAG_MOBILE_APP_DOWNLOAD` | Mobile app store link      | Amber Flag 9 |

---

## Combined implementation order (Parts 1 + 2)

Run prompts in this exact sequence for minimum risk:

```
PROMPT 0   → Fix meta tags           (5 min, zero risk)
PROMPT 1-A → Run tenant audit        (10 min, read-only)
PROMPT 1-B → Tenant client           (1–2 hrs)
PROMPT 1-C → Migrate API routes      (2–4 hrs, by priority group)
PROMPT 2-A → Cloudflare rules        (30 min, dashboard config)
PROMPT 2-B → API rate limiter        (1–2 hrs)
PROMPT 3-A → Sentry                  (1 hr)
PROMPT 3-B → Health endpoint         (30 min)
PROMPT 3-C → Slow query + indexes    (1 hr)
── STAGING DEPLOY + RED FLAG VERIFICATION ──
PROMPT 4-A → HOD audit               (20 min, read-only)
PROMPT 4-B → Feature flags           (1 hr)
PROMPT 5   → Routing cleanup         (1 hr)
PROMPT 6-A → Caching layer           (2 hrs)
PROMPT 6-B → Connection pool         (30 min)
PROMPT 7   → AI abstraction          (2–3 hrs)
PROMPT 8   → Innovation Hub          (2 hrs)
PROMPT 9   → Mobile scope            (1 hr)
── FULL STAGING VERIFICATION ──
── PRODUCTION DEPLOY ──
```

**Total estimated implementation time: 20–30 hours**  
Complete Part 1 before your penetration test.  
Complete Part 2 before onboarding more than five schools.

---

_Document version: 1.0 — Part 2 of 2.  
Addresses amber flags 4–9, the immediate branding fix, and all secondary
hardening items from the ZSMS architecture review, May 2026._
