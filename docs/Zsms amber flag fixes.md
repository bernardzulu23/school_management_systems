# ZSMS — Amber Flag & Hardening Prompt (Part 2)

**Project:** Zambian School Management System (`school_management_systems`)  
**Stack:** Next.js 15 App Router · TypeScript · PostgreSQL · Prisma · Railway · Cloudflare WAF  
**Scope:** Amber flags, immediate branding fix, caching, schema health, AI vendor
abstraction, and Innovation Hub gating — all issues from the architecture review
that are not critical data breaches but will cause production pain as you scale.  
**Prerequisite:** Complete Part 1 (red flag fixes) before starting this document.

---

## How to use this document

Same pattern as Part 1. Each section has a **PROMPT** block you paste into
Claude Code one at a time. Sections are ordered by urgency — start at the
top and work down. Do not run a prompt before the one before it is verified.

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
    // FEATURE_FLAG_HOD_BUDGET=true in Railway enables it without a redeploy
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
unnecessary database spike. Railway's PostgreSQL has connection limits — you will
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

The project uses Prisma with PostgreSQL on Railway. Next.js serverless-style
function execution can create many short-lived Prisma client instances,
exhausting PostgreSQL's connection limit (typically 100 on Railway's plans).

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

Then in the Railway project environment variables, update DATABASE_URL to
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
    2. Set OPENAI_API_KEY in Railway
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

Add all of these to Railway → Project → Variables before production:

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
