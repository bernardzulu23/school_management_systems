ZSMS — Phase 4 Cursor Agent Prompt

## Security Hardening + Scale and Ecosystem

**Status:** Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · RAG ✅ · Starting Phase 4
**Project:** Zambian School Management System (ZSMS)
**Stack:** Next.js 16 · React 19 · PostgreSQL/Prisma 6 · Neon · JWT · Groq AI (FREE) · Africa's Talking · Lipila · Expo

---

## ⚠️ ABSOLUTE RULES — NON-NEGOTIABLE

1. **NEVER install `@ai-sdk/anthropic`, `@ai-sdk/openai`, or any paid AI provider.**
2. **NEVER add a service that charges per request beyond what is already in the project.**
3. **`npm test` and `npm run build` must pass after EVERY task.** Fix all failures before continuing.
4. **After every task:** update `CHANGELOG.md`, the relevant `docs/` file, and `review.md`.
5. **JSDoc every new function, class, and API route.**
6. **Read a file before editing it. Never guess.**
7. **Security rule:** NEVER trust any input from `req.body`, `req.query`, or `req.params` without Zod validation. No exceptions.

---

## PHASE 4 OVERVIEW

Phase 4 has two tracks that run in parallel:

**Track A — Security Hardening (Tasks 23–28)**
These are not optional. ZSMS handles personal data for thousands of Zambian schoolchildren.
Every security task must be completed before the first new feature in Track B ships.

**Track B — Scale and Ecosystem (Tasks 29–33)**
New features that make ZSMS the operating system for Zambian education.

| Task | Name                                       | Track | Week | Priority    |
| ---- | ------------------------------------------ | ----- | ---- | ----------- |
| 23   | CVE Patch + Middleware Security Audit      | A     | 1    | 🔴 Critical |
| 24   | Input Validation Layer (All API Routes)    | A     | 1    | 🔴 Critical |
| 25   | Content Security Policy + Security Headers | A     | 1–2  | 🔴 Critical |
| 26   | Dependency Audit + Automated Scanning      | A     | 2    | 🔴 Critical |
| 27   | Multi-Tenant Penetration Hardening         | A     | 2    | 🔴 Critical |
| 28   | Secrets Management + Token Hardening       | A     | 2–3  | 🔴 Critical |
| 29   | Teaching Materials Marketplace             | B     | 3    | 🟠 High     |
| 30   | In-App School Fees Collection              | B     | 3–4  | 🟠 High     |
| 31   | Expo Mobile Feature Expansion              | B     | 4    | 🟠 High     |
| 32   | National Assessment Platform               | B     | 4–5  | 🟡 Medium   |
| 33   | Phase 4 Docs + Phase 5 Roadmap             | A+B   | 5    | 🟢 Required |

---

# TRACK A — SECURITY HARDENING

---

## TASK 23 — CVE Patch + Middleware Security Audit (Week 1, ~2 days)

### 23.1 Check and patch CVE-2025-29927

**Background:**
CVE-2025-29927 is a CVSS 9.1 critical vulnerability in Next.js.
By sending an `x-middleware-subrequest` header, attackers can bypass ALL middleware logic —
including authentication and authorization — and access any protected route without credentials.
It affects versions 11.1.4 through 15.2.2.

**Step 1: Check your Next.js version**

```bash
cat package.json | grep '"next"'
```

**Step 2: Update if not already on 15.2.3+**

```bash
npm install next@latest
npm run build  # Verify no breaking changes
```

**Step 3: Block the header at the proxy level regardless of version**

Find `proxy.js` in the project root. Add this as the FIRST thing in the request handler,
before any other processing:

```javascript
/**
 * SECURITY: Block CVE-2025-29927 middleware bypass attempt.
 *
 * The x-middleware-subrequest header is an internal Next.js header used to
 * prevent infinite middleware loops. If an external request contains it,
 * it is an attack attempt. Strip it unconditionally.
 *
 * CVE: CVE-2025-29927 (CVSS 9.1)
 * Affected: Next.js 11.1.4 to 15.2.2
 * Fixed in: 15.2.3+ (but we strip at proxy level as defence-in-depth)
 *
 * Reference: https://vercel.com/blog/postmortem-on-next-js-middleware-bypass
 */
function stripDangerousHeaders(req) {
  // These are internal Next.js headers that must never come from external requests
  const BLOCKED_HEADERS = [
    'x-middleware-subrequest',
    'x-middleware-invoke',
    'x-invoke-path',
    'x-invoke-query',
    'x-invoke-output',
    'x-next-intl-locale', // Can be spoofed for SSRF in i18n apps
  ]

  BLOCKED_HEADERS.forEach((header) => {
    delete req.headers[header]
  })
}

// Call at the top of the proxy handler, before any routing logic:
// stripDangerousHeaders(req);
```

### 23.2 Audit middleware — move auth to route handlers

**The architectural lesson from CVE-2025-29927:**
Middleware is not a security boundary. It runs at the edge and can be bypassed.
Your actual auth checks MUST also live inside the Route Handlers themselves.

Open `middleware.js` (or `proxy.js`). Identify every route that is protected only by middleware
with NO server-side auth check in the route handler itself.

For each protected API route in `app/api/`, verify that it has:

```javascript
// At the TOP of every protected route handler:
import { verifyAuth } from '@/lib/middleware/auth'

export async function GET(req) {
  // This check runs INSIDE the route handler — cannot be bypassed by middleware exploit
  const { user, schoolId, error } = await verifyAuth(req)
  if (error) return Response.json({ error }, { status: 401 })

  // ... rest of handler
}
```

Create a checklist of all API routes that are missing server-side auth verification.
Fix all of them — especially: dashboard routes, lesson-plan routes, SBA routes, ECZ routes,
user management routes, timetable routes, payment routes.

### 23.3 Create auth verification utility

Create `lib/middleware/verify-auth.js`:

```javascript
/**
 * Server-side auth verification utility.
 *
 * IMPORTANT: This runs INSIDE route handlers, not in middleware.
 * Middleware (proxy.js) does a first-pass check, but this is the
 * authoritative auth check that cannot be bypassed.
 *
 * WHY TWO LAYERS:
 * - Middleware: Fast edge check, redirects unauthenticated browsers
 * - verifyAuth(): Authoritative server-side check, cannot be bypassed
 *   even if middleware is exploited (CVE-2025-29927)
 *
 * USAGE:
 *   const { user, schoolId, error } = await verifyAuth(req);
 *   if (error) return Response.json({ error }, { status: 401 });
 *
 * ROLE CHECK:
 *   const { user, error } = await verifyAuth(req, ['headteacher', 'hod']);
 *   // Returns 403 if user role not in allowed list
 */
import jwt from 'jsonwebtoken'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/utils/logger'

export async function verifyAuth(req, allowedRoles = null) {
  const log = logger({ route: req.url })

  try {
    // Extract JWT from HTTP-only cookie (cannot be accessed by JS — XSS safe)
    const cookieHeader = req.headers.get('cookie') || ''
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=')
        return [k.trim(), v.join('=')]
      })
    )

    const token = cookies['zsms_token'] || cookies['auth_token'] || cookies['token']

    if (!token) {
      return { user: null, schoolId: null, error: 'Authentication required' }
    }

    // Verify signature and expiry
    const decoded = jwt.verify(token, env.jwtSecret)

    // Role check if specified
    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
      log.warn('Forbidden — insufficient role', {
        userRole: decoded.role,
        requiredRoles: allowedRoles,
        userId: decoded.userId,
      })
      return {
        user: null,
        schoolId: null,
        error: 'Forbidden — insufficient permissions',
        status: 403,
      }
    }

    return {
      user: decoded,
      userId: decoded.userId,
      schoolId: decoded.schoolId,
      role: decoded.role,
      error: null,
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { user: null, schoolId: null, error: 'Session expired — please log in again' }
    }
    if (err.name === 'JsonWebTokenError') {
      return { user: null, schoolId: null, error: 'Invalid session token' }
    }
    log.error('Auth verification error', { error: err.message })
    return { user: null, schoolId: null, error: 'Authentication failed' }
  }
}

/**
 * Helper: return a 401 response with consistent format.
 * Use in route handlers after verifyAuth() returns an error.
 */
export function unauthorized(message = 'Authentication required') {
  return Response.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 })
}

export function forbidden(message = 'Insufficient permissions') {
  return Response.json({ error: message, code: 'FORBIDDEN' }, { status: 403 })
}
```

### 23.4 Add security test

Create `__tests__/security/auth-bypass.test.js`:

```javascript
/**
 * Security tests: Authentication bypass prevention
 *
 * These tests verify that CVE-2025-29927 and similar bypasses
 * do not work against ZSMS API routes.
 *
 * What we test:
 * 1. Request with x-middleware-subrequest header → 401 (not 200)
 * 2. Request with no token → 401 on all protected routes
 * 3. Request with expired token → 401
 * 4. Request with valid token but wrong role → 403
 * 5. Teacher cannot access headteacher-only routes
 * 6. Student cannot access teacher routes
 * 7. School A's token cannot access School B's data
 */
import { describe, it, expect, vi } from 'vitest'
// ... full test implementation
```

**Documentation:** Update `docs/SECURITY.md` with CVE-2025-29927 fix and the dual-layer auth pattern.

---

## TASK 24 — Input Validation Layer (All API Routes) (Week 1, ~3 days)

### Why every input must be validated

Input validation is the first line of defence against SQL injection, XSS,
and business logic attacks. Zod is already installed from Phase 1. The problem
is it is only used for AI schemas — not for API request bodies.

Every POST, PUT, PATCH, DELETE route in `app/api/` must validate its request body
against a Zod schema BEFORE touching the database. No exceptions.

### 24.1 Create request validation utility

Create `lib/middleware/validate-request.js`:

```javascript
/**
 * Request body validation using Zod.
 *
 * WHY: Without validation, a malicious user can send:
 *   - { "role": "headteacher" } to escalate their own role
 *   - { "schoolId": "other-school" } to access another school's data
 *   - Very long strings to cause DB errors or denial of service
 *   - Unexpected types that crash downstream logic
 *
 * USAGE in route handlers:
 *   const { data, error } = await validateBody(req, CreateUserSchema);
 *   if (error) return error; // Returns a 400 Response automatically
 *
 * ADDING NEW SCHEMAS:
 *   1. Define the Zod schema in lib/schemas/ (see organisation below)
 *   2. Import and use with validateBody()
 *   3. The schema is the source of truth for what this endpoint accepts
 */
import { z } from 'zod'

/**
 * Validate a request body against a Zod schema.
 * Returns either { data: validatedData, error: null } or { data: null, error: Response }
 *
 * @param {Request} req
 * @param {z.ZodSchema} schema
 * @returns {Promise}
 */
export async function validateBody(req, schema) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))

      return {
        data: null,
        error: Response.json({ error: 'Validation failed', details: errors }, { status: 400 }),
      }
    }

    return { data: result.data, error: null }
  } catch (e) {
    return {
      data: null,
      error: Response.json({ error: 'Invalid JSON in request body' }, { status: 400 }),
    }
  }
}

/**
 * Validate URL query parameters.
 *
 * @param {URL} url
 * @param {z.ZodSchema} schema
 */
export function validateQuery(url, schema) {
  const params = Object.fromEntries(url.searchParams.entries())
  const result = schema.safeParse(params)

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return {
      data: null,
      error: Response.json({ error: 'Invalid query parameters', details: errors }, { status: 400 }),
    }
  }

  return { data: result.data, error: null }
}
```

### 24.2 Create API request schemas

Create `lib/schemas/index.js` — the central schema registry:

```javascript
/**
 * ZSMS API Request Schemas
 *
 * All Zod schemas for validating API request bodies and query params.
 * Import from here, not from individual schema files.
 *
 * SECURITY RULES embedded in schemas:
 * - Role field: NEVER accept from request body (prevents role escalation)
 * - schoolId field: NEVER accept from request body (use from JWT only)
 * - Passwords: min 8 chars, no max to prevent hash-length attacks
 * - IDs: always validate as cuid() format to prevent injection
 * - Strings: always have .max() to prevent denial-of-service payloads
 * - Enums: always explicit list to prevent unexpected values
 *
 * ADDING A NEW SCHEMA:
 * 1. Define it here with a comment explaining what endpoint uses it
 * 2. Import in the route handler: import { MySchema } from '@/lib/schemas'
 * 3. Use: const { data, error } = await validateBody(req, MySchema)
 */
import { z } from 'zod'

// ─── COMMON FIELDS ────────────────────────────────────────────────────────────
const cuid = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format')
const zambiaMobile = z
  .string()
  .regex(/^\+260[79]\d{8}$/, 'Phone number must be a valid Zambian number (+260XXXXXXXXX)')

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(1000), // Max prevents denial-of-service via bcrypt
  // NEVER include: role, schoolId — these come from DB only
})

export const RegisterUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(1000),
  // role comes from the creating user's permissions — never from request
})

export const PasswordResetRequestSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
})

export const PasswordResetSchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(8).max(1000),
})

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export const OnboardingStartSchema = z.object({
  schoolName: z.string().min(3).max(200).trim(),
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(1000),
  phone: zambiaMobile.optional(),
  province: z.string().max(50).optional(),
  district: z.string().max(100).optional(),
})

export const SelectPlanSchema = z.object({
  plan: z.enum(['trial', 'basic', 'standard', 'premium']),
  sessionToken: z.string().min(1).max(500),
})

// ─── LESSON PLANS ─────────────────────────────────────────────────────────────

export const CreateLessonPlanSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  subject: z.string().min(1).max(100),
  form: z.enum([
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 10',
    'Grade 11',
    'Grade 12',
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
  ]),
  duration: z.number().int().min(10).max(240),
  topic: z.string().min(3).max(300).trim(),
  objectives: z.string().max(2000).optional(),
  // schoolId comes from JWT — never from request
  // teacherId comes from JWT — never from request
})

export const GenerateLessonPlanSchema = z.object({
  subject: z.string().min(1).max(100),
  form: z.string().min(1).max(50),
  topic: z.string().min(3).max(300).trim(),
  duration: z.number().int().min(10).max(240),
  learningStyle: z.enum(['mixed', 'visual', 'auditory', 'kinesthetic']).default('mixed'),
  resourceLevel: z.enum(['low', 'moderate', 'well-resourced']).default('moderate'),
  priorKnowledge: z.string().max(500).optional(),
  coreCompetencies: z.array(z.string().max(100)).min(1).max(12),
  crossCuttingThemes: z.array(z.string().max(100)).max(5).optional(),
  realWorldContext: z.string().max(500).optional(),
})

// ─── SBA / ECZ ─────────────────────────────────────────────────────────────

export const CreateSBATaskSchema = z.object({
  subjectId: cuid,
  form: z.enum(['Form 1', 'Form 2', 'Form 3']), // NEVER Form 4
  taskType: z.enum([
    'Project',
    'Practical task',
    'Assignment',
    'Presentation',
    'Fieldwork',
    'Portfolio',
    'Observation',
    'End of term test',
  ]),
  title: z.string().min(3).max(300).trim(),
  term: z.number().int().min(1).max(3),
  academicYear: z.string().regex(/^\d{4}$/, 'Academic year must be 4-digit year'),
  competencyIds: z.array(cuid).min(1).max(12),
})

export const RecordSBAScoreSchema = z.object({
  studentId: cuid,
  taskId: cuid,
  task1Score: z.number().min(0).max(20).nullable().optional(),
  task2Score: z.number().min(0).max(20).nullable().optional(),
  task3Score: z.number().min(0).max(20).nullable().optional(),
  termTestScore: z.number().min(0).max(40).nullable().optional(),
  remarks: z.string().max(500).optional(),
})

// ─── ATTENDANCE ────────────────────────────────────────────────────────────

export const OpenAttendanceSessionSchema = z.object({
  classId: cuid,
  subjectId: cuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
})

export const MarkAttendanceSchema = z.object({
  studentId: cuid,
  sessionId: cuid,
  status: z.enum(['present', 'absent', 'late', 'excused']),
})

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: zambiaMobile.optional(),
  // email: NOT updatable via API (requires re-verification)
  // role: NOT updatable here (separate admin endpoint with elevated permissions)
  // schoolId: NEVER updatable (immutable after creation)
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1000),
  newPassword: z.string().min(8).max(1000),
})

// ─── SMS ──────────────────────────────────────────────────────────────────

export const SendSMSSchema = z.object({
  to: z.array(zambiaMobile).min(1).max(100), // Max 100 per request
  message: z.string().min(1).max(459), // AT limit: 3 SMS concatenated
  templateName: z.string().max(100).optional(),
})

// ─── TIMETABLE ────────────────────────────────────────────────────────────

export const GenerateTimetableSchema = z.object({
  academicYearId: cuid,
  termId: cuid,
  useOrTools: z.boolean().default(false), // Opt-in to OR-Tools solver
  constraints: z
    .object({
      maxPeriodsPerTeacherPerDay: z.number().int().min(1).max(10).default(6),
      noDoublePeriodFriday: z.array(z.string()).optional(),
    })
    .optional(),
})
```

### 24.3 Apply schemas to all API routes

Go through every file in `app/api/` that handles POST, PUT, PATCH, or DELETE.
For each one, add Zod validation using the schemas defined above.

Pattern to add to every mutation route:

```javascript
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateLessonPlanSchema } from '@/lib/schemas'
import { verifyAuth } from '@/lib/middleware/verify-auth'

export async function POST(req) {
  // Step 1: Verify auth (server-side — not middleware only)
  const { user, schoolId, error } = await verifyAuth(req, ['teacher', 'hod', 'headteacher'])
  if (error) return Response.json({ error }, { status: 401 })

  // Step 2: Validate input
  const { data, error: validationError } = await validateBody(req, CreateLessonPlanSchema)
  if (validationError) return validationError

  // Step 3: Use validated data — it is now typed and safe
  // data.title is guaranteed to be a string 3-200 chars
  // data.subject is guaranteed to be valid
  // schoolId comes from JWT (not from data) — prevents cross-tenant write
  const lesson = await prisma.lessonPlan.create({
    data: {
      ...data,
      schoolId, // From JWT — not from request body
      teacherId: user.userId, // From JWT — not from request body
    },
  })

  return Response.json(lesson, { status: 201 })
}
```

### 24.4 Add validation tests

Create `__tests__/security/input-validation.test.js`:

```javascript
/**
 * Security tests: Input validation
 *
 * What we test:
 * 1. Role escalation: { "role": "headteacher" } in body → ignored, user keeps original role
 * 2. schoolId injection: { "schoolId": "other-school" } in body → ignored
 * 3. SQL injection attempt in string field → Zod strips/rejects
 * 4. Oversized payload → 400 before reaching DB
 * 5. Invalid enum value → 400 with clear error
 * 6. Missing required field → 400 with field name in error
 */
```

---

## TASK 25 — Content Security Policy + Security Headers (Week 1–2, ~2 days)

### 25.1 Add nonce-based CSP

A Content Security Policy prevents XSS attacks by telling the browser which scripts are allowed to run. Without CSP, if an attacker injects JavaScript into your page (via a stored XSS vulnerability), the browser will execute it. With CSP and nonces, only scripts that were explicitly approved by the server run.

In `next.config.js`, add comprehensive security headers:

```javascript
/**
 * Security headers for ZSMS.
 *
 * APPLIED TO: All routes (via Next.js headers config)
 *
 * HEADERS EXPLAINED:
 *
 * Content-Security-Policy:
 *   Prevents XSS by whitelisting allowed script/style sources.
 *   'strict-dynamic' allows nonce-approved scripts to load sub-scripts.
 *   report-uri sends violations to Sentry (if configured).
 *
 * Strict-Transport-Security:
 *   Forces HTTPS for 2 years. Prevents SSL stripping attacks.
 *   max-age=63072000 = 2 years in seconds.
 *
 * X-Frame-Options: SAMEORIGIN
 *   Prevents clickjacking — page can only be embedded by same origin.
 *
 * X-Content-Type-Options: nosniff
 *   Prevents MIME-type sniffing attacks.
 *
 * Referrer-Policy: strict-origin-when-cross-origin
 *   Prevents leaking school subdomains in Referer header to external sites.
 *
 * Permissions-Policy:
 *   Disables dangerous browser APIs the app doesn't need.
 *   Camera and microphone disabled — QR scanning uses the device camera API
 *   which is separate from the Permissions Policy camera restriction.
 */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=self, microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
    // camera=self: allows QR scanning (device camera) from same origin
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'strict-dynamic' https://js.sentry-cdn.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // unsafe-inline for styles only — not scripts
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // blob: for QR code canvas → blob URL conversion
      // https: for school logos and student photos
      "connect-src 'self' https://api.groq.com https://o0.ingest.sentry.io",
      // Groq AI API and Sentry error reporting
      "frame-ancestors 'none'",
      // Stronger than X-Frame-Options
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
]

// In next.config.js:
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // API routes: no caching of sensitive data
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
}
```

### 25.2 Strip dangerous request headers at proxy

In `proxy.js`, add request sanitization:

```javascript
/**
 * SECURITY: Strip headers that should never come from external clients.
 *
 * These headers are used internally by Next.js and our application.
 * If an attacker sends them, they can manipulate routing, bypass auth,
 * or spoof internal state.
 *
 * STRIP UNCONDITIONALLY on every incoming request:
 */
const INTERNAL_HEADERS_TO_STRIP = [
  'x-middleware-subrequest', // CVE-2025-29927
  'x-middleware-invoke', // Internal Next.js
  'x-invoke-path', // Internal Next.js
  'x-invoke-query', // Internal Next.js
  'x-invoke-output', // Internal Next.js
  'x-forwarded-host', // Can spoof subdomain resolution
  'x-school-subdomain-override', // Internal ZSMS header — if spoofed, attacker picks school
  'x-platform-admin-override', // Internal — cannot be set externally
]
```

### 25.3 Add CSP test

Create `__tests__/security/csp.test.js`:

```javascript
/**
 * Security tests: CSP and security headers
 *
 * What we test:
 * 1. GET /api/health response includes X-Content-Type-Options: nosniff
 * 2. GET /api/health response includes X-Frame-Options
 * 3. GET /api/health has Cache-Control: no-store
 * 4. POST /api/auth/login response has no sensitive data in headers
 */
```

---

## TASK 26 — Dependency Audit + Automated Scanning (Week 2, ~1 day)

### 26.1 Run immediate audit

```bash
# Check for known vulnerabilities
npm audit --audit-level=high

# Fix automatically where safe
npm audit fix

# Check what outdated packages exist
npm outdated
```

Fix all HIGH and CRITICAL vulnerabilities before proceeding.
For each fix, run `npm test` to ensure nothing broke.

### 26.2 Set up GitHub Dependabot

Create `.github/dependabot.yml`:

```yaml
# Dependabot configuration for ZSMS
# Automatically creates PRs when dependencies have security vulnerabilities.
# Free for public repos, and for security updates on private repos.
#
# HOW IT WORKS:
# - Scans package.json daily
# - Creates a PR for each vulnerable dependency
# - Assignees (you) review and merge or dismiss
# - PRs include vulnerability details and fix description

version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '08:00'
      timezone: 'Africa/Lusaka'
    # Only open PRs for security updates (not just updates)
    open-pull-requests-limit: 10
    reviewers:
      - 'your-github-username'
    labels:
      - 'dependencies'
      - 'security'
    # Group non-security updates to reduce PR noise
    groups:
      non-security-updates:
        update-types:
          - 'minor'
          - 'patch'

  # Python solver-service dependencies
  - package-ecosystem: 'pip'
    directory: '/solver-service'
    schedule:
      interval: 'weekly'
      day: 'monday'
    labels:
      - 'dependencies'
      - 'solver-service'
```

### 26.3 Add audit to CI

Create `.github/workflows/security.yml`:

```yaml
# ZSMS Security Audit — runs on every PR and weekly
#
# WHAT IT DOES:
# 1. Runs npm audit and fails if HIGH/CRITICAL vulns found
# 2. Runs npm test to verify no regression from dep changes
# 3. Checks for secrets accidentally committed (using git-secrets pattern)
#
# FREE: GitHub Actions is free for public repos and has 2,000 min/month
# for private repos (more than enough for this project)

name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1' # Every Monday 08:00 Lusaka time (UTC+2)

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=high --production
        # Fails build if HIGH or CRITICAL vulnerabilities found in production deps

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          JWT_SECRET: test-jwt-secret-minimum-32-characters
          RESEND_API_KEY: re_test_key
          EMAIL_FROM: test@test.com
          GROQ_API_KEY: gsk_test_key

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for secret scanning

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --only-verified
```

### 26.4 Add npm scripts

Add to `package.json`:

```json
"audit:security": "npm audit --audit-level=high --production",
"audit:full": "npm audit",
"audit:fix": "npm audit fix",
"check:deps": "npm outdated"
```

---

## TASK 27 — Multi-Tenant Penetration Hardening (Week 2, ~2 days)

### The three multi-tenant attack vectors to close

Per OWASP Multi-Tenant Security Cheat Sheet, the critical risks are:

1. **Cross-tenant data leakage** — School A reads School B's data
2. **Tenant impersonation** — Attacker forges a schoolId in a request
3. **Privilege escalation** — Teacher promotes themselves to headteacher

### 27.1 Add tenant isolation tests

Create `__tests__/security/tenant-isolation.test.js`:

```javascript
/**
 * CRITICAL Security tests: Multi-tenant data isolation
 *
 * If any of these tests fail, there is a data breach vulnerability.
 * These must pass before every production deployment.
 *
 * What we test:
 * 1. School A's JWT cannot read School B's learners
 * 2. School A's JWT cannot write to School B's lesson plans
 * 3. Forged schoolId in request body is ignored (JWT schoolId used instead)
 * 4. Teacher from School A cannot access School B's timetable
 * 5. Platform admin can read any school (controlled bypass)
 * 6. DEBS can only read schools in their district
 *
 * HOW WE TEST:
 * - Create mock tokens for school-a-id and school-b-id
 * - Try to access school-b-id resources with school-a-id token
 * - Verify 403 or empty results (not school B's data)
 */
import { describe, it, expect, vi } from 'vitest'

describe('Multi-tenant isolation', () => {
  it('School A JWT cannot read School B learners', async () => {
    // Arrange: Token is scoped to school-a
    const schoolAToken = createTestToken({ schoolId: 'school-a', role: 'teacher' })

    // Act: Try to fetch school-b users
    const req = createMockRequest({
      headers: { cookie: `zsms_token=${schoolAToken}` },
      url: '/api/users?schoolId=school-b', // Trying to specify a different school
    })

    const response = await GET(req)
    const data = await response.json()

    // Assert: Either 403 or empty list — never school-b's data
    expect([200, 403]).toContain(response.status)
    if (response.status === 200) {
      // If 200, must be empty or school-a's data only
      data.users?.forEach((user) => {
        expect(user.schoolId).toBe('school-a')
        expect(user.schoolId).not.toBe('school-b')
      })
    }
  })

  it('schoolId in request body is ignored — JWT schoolId is used', async () => {
    const teacherToken = createTestToken({ schoolId: 'school-a', role: 'teacher' })

    const req = createMockRequest({
      headers: { cookie: `zsms_token=${teacherToken}` },
      method: 'POST',
      body: {
        title: 'Lesson Plan',
        subject: 'Mathematics I',
        schoolId: 'school-b', // Attack: trying to write to another school
      },
    })

    // The created resource should have schoolId = 'school-a' (from JWT)
    // Not 'school-b' (from body)
    // ... implementation
  })

  it('Teacher cannot escalate to headteacher via request body', async () => {
    const teacherToken = createTestToken({ schoolId: 'school-a', role: 'teacher' })

    const req = createMockRequest({
      headers: { cookie: `zsms_token=${teacherToken}` },
      method: 'PUT',
      url: '/api/users/profile',
      body: {
        name: 'New Name',
        role: 'headteacher', // Attack: trying to escalate role
      },
    })

    const response = await PUT(req)
    // Must be 403 or the role in the DB must still be 'teacher'
    // ... implementation
  })
})
```

### 27.2 Add schoolId verification helper

Create `lib/middleware/verify-tenant.js`:

```javascript
/**
 * Tenant verification middleware.
 *
 * Ensures the authenticated user belongs to the school they are
 * trying to access. This is a defence-in-depth check on top of RLS.
 *
 * USAGE:
 *   const { schoolId, error } = verifyTenant(user, requestedSchoolId);
 *   if (error) return forbidden(error);
 *
 * This prevents:
 * - A teacher from School A using their valid JWT to hit School B's endpoints
 * - A platform admin accidentally scoping queries to wrong school
 */
export function verifyTenant(authenticatedUser, requestedSchoolId) {
  // Platform admins can access any school
  if (authenticatedUser.role === 'platform_admin') {
    return { schoolId: requestedSchoolId, error: null }
  }

  // DEBS can access schools in their district only
  // (district check happens in the DEBS-specific routes)

  // All other roles: must match their JWT schoolId
  if (authenticatedUser.schoolId !== requestedSchoolId) {
    return {
      schoolId: null,
      error: `Access denied — your account belongs to a different school`,
    }
  }

  return { schoolId: authenticatedUser.schoolId, error: null }
}

/**
 * Extract and verify schoolId from route params + JWT.
 * Use in routes that have a [schoolId] in the URL path.
 *
 * @param {Object} user - Decoded JWT payload
 * @param {Object} params - Next.js route params ({ schoolId: '...' })
 */
export function getVerifiedSchoolId(user, params) {
  const requestedSchoolId = params?.schoolId || user.schoolId
  return verifyTenant(user, requestedSchoolId)
}
```

### 27.3 Audit all routes for schoolId leakage

Go through every GET route in `app/api/` that returns a list of records.
Verify each one has **at least one** of these protections:

1. RLS context set (from Task 16, Phase 3)
2. Explicit `WHERE schoolId = ${user.schoolId}` in Prisma query
3. Route-level `verifyTenant()` check

Create a documentation entry in `docs/SECURITY.md` listing all routes and their isolation method.

---

## TASK 28 — Secrets Management + Token Hardening (Week 2–3, ~2 days)

### 28.1 JWT hardening

In `lib/middleware/auth.js` (existing auth login handler), harden the JWT:

```javascript
/**
 * JWT Security Hardening
 *
 * CHANGES FROM CURRENT IMPLEMENTATION:
 * 1. Shorter access token lifetime: 15 minutes (not hours/days)
 *    - Limits damage from stolen tokens
 *    - Transparent to users via silent refresh
 *
 * 2. Longer refresh token: 7 days
 *    - Stored in separate HttpOnly cookie
 *    - Cannot be accessed by JavaScript
 *    - Rotated on every use (refresh token rotation)
 *
 * 3. Token binding: embed schoolId AND role hash
 *    - Prevents using a token from one role as another
 *    - Prevents using a token from one school at another
 *
 * 4. Explicit algorithm: HS256 (never 'none' — JWT algorithm confusion attack)
 *
 * 5. Audience claim: 'zsms-api' — prevents token reuse across services
 */

// When issuing tokens after login:
const accessToken = jwt.sign(
  {
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
    email: user.email,
    // Audience prevents token reuse in other contexts
    aud: 'zsms-api',
    // Issued-at for rotation detection
    iat: Math.floor(Date.now() / 1000),
  },
  env.jwtSecret,
  {
    algorithm: 'HS256', // Explicit — prevents algorithm confusion
    expiresIn: '15m', // Short lifetime
  }
)

const refreshToken = jwt.sign(
  { userId: user.id, schoolId: user.schoolId, type: 'refresh' },
  env.jwtSecret + '-refresh', // Different secret for refresh tokens
  { algorithm: 'HS256', expiresIn: '7d' }
)

// Set both as HttpOnly cookies:
// access: HttpOnly, Secure, SameSite=Strict, Path=/, max-age=900 (15 min)
// refresh: HttpOnly, Secure, SameSite=Strict, Path=/api/auth/refresh, max-age=604800 (7 days)
// Path restriction on refresh token: can ONLY be sent to the refresh endpoint
```

### 28.2 Verify cookies are HttpOnly

Check every place a JWT or session token is set in a cookie.
Every cookie containing authentication data MUST have:

- `HttpOnly` — JavaScript cannot read it (prevents XSS token theft)
- `Secure` — only sent over HTTPS (prevents MITM)
- `SameSite=Strict` — not sent on cross-site requests (prevents CSRF)
- `Path` set to the minimum necessary path

If any auth cookie is currently set without these flags, fix it.

### 28.3 Add refresh token rotation

In `app/api/auth/refresh/route.js`:

```javascript
/**
 * POST /api/auth/refresh
 *
 * Silently refreshes the access token using the refresh token.
 * Called automatically by the frontend when an API returns 401.
 *
 * SECURITY: Refresh token rotation — each use of a refresh token
 * invalidates the old one and issues a new one. If an attacker steals
 * a refresh token and uses it, the legitimate user's next refresh will
 * fail (old token gone), alerting them to the compromise.
 *
 * IMPLEMENTATION:
 * 1. Verify refresh token signature and expiry
 * 2. Check refresh token has not been used before (rotation table)
 * 3. Issue new access token (15 min)
 * 4. Issue new refresh token (7 days)
 * 5. Invalidate old refresh token in rotation table
 * 6. Return new access token in response cookie
 */
```

### 28.4 Add env secret rotation documentation

Create `docs/SECRET_ROTATION.md`:

```
Instructions for rotating JWT_SECRET, GROQ_API_KEY, LIPILA_API_KEY,
AFRICASTALKING_API_KEY, and RESEND_API_KEY without downtime.

For JWT_SECRET rotation:
1. Set JWT_SECRET_NEW=<new secret> in Vercel env
2. Update verify-auth.js to accept both old and new secret temporarily
3. Wait for all existing sessions to expire (max 15 minutes)
4. Remove JWT_SECRET_OLD from verify-auth.js
5. Set JWT_SECRET=<new value> and remove JWT_SECRET_NEW
6. Redeploy
```

---

# TRACK B — SCALE AND ECOSYSTEM

---

## TASK 29 — Teaching Materials Marketplace (Week 3, ~3 days)

### Why this matters

Teachers are generating ECZ-aligned lesson plans, SBA tasks, and rubrics using the AI tools.
Currently these materials are locked to each school.
A marketplace where teachers share and discover materials across schools
makes every teacher better — and generates network effects for ZSMS.

### 29.1 Add Prisma models

Add to `prisma/schema.prisma`:

```prisma
/**
 * SharedMaterial — a lesson plan, SBA task, or rubric shared to the marketplace.
 *
 * APPROVAL FLOW: teacher uploads → school HOD approves → visible in marketplace
 * Privacy: schoolId is NOT exposed in marketplace listings (only province/district)
 * Attribution: teacher name is shown only if they opt in
 */
model SharedMaterial {
  id              String   @id @default(cuid())
  // Source
  schoolId        String
  teacherId       String
  // Content
  type            String   // "lesson_plan" | "sba_task" | "rubric" | "exam_question"
  title           String
  subject         String
  form            String
  topic           String
  content         Json     // The full structured content (LessonPlanSchema, SBATaskSchema, etc.)
  // Metadata
  cbcCompetencies Json     // string[] — which competencies it addresses
  resourceLevel   String   // "low" | "moderate" | "well-resourced"
  tags            Json     // string[] — searchable tags
  // Attribution
  showAuthorName  Boolean  @default(false)
  province        String?  // Region context — not exact school
  // Approval
  status          String   @default("pending") // pending | approved | rejected
  approvedBy      String?  // HOD user ID
  approvedAt      DateTime?
  rejectionReason String?
  // Engagement
  downloadCount   Int      @default(0)
  rating          Float?   // Average of MaterialRating.score

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  school          School   @relation(fields: [schoolId], references: [id])
  teacher         User     @relation(fields: [teacherId], references: [id])
  ratings         MaterialRating[]

  @@index([subject, form, type])
  @@index([status])
}

model MaterialRating {
  id          String   @id @default(cuid())
  materialId  String
  teacherId   String
  score       Int      // 1-5
  comment     String?  @db.Text
  createdAt   DateTime @default(now())

  material    SharedMaterial @relation(fields: [materialId], references: [id])
  teacher     User           @relation(fields: [teacherId], references: [id])

  @@unique([materialId, teacherId]) // One rating per teacher per material
}
```

### 29.2 Create marketplace API routes

Create `app/api/marketplace/route.js`:

```javascript
/**
 * GET /api/marketplace
 * Search and browse shared teaching materials.
 *
 * PUBLIC: No auth required — allows browsing before signing up.
 * FILTERED: Only shows approved materials.
 * PRIVACY: School identity is hidden — only province shown.
 *
 * Query params:
 *   subject, form, type, resourceLevel, search (full-text)
 *   page (default 1), limit (default 20, max 50)
 */
```

Create `app/api/marketplace/submit/route.js`:

```javascript
/**
 * POST /api/marketplace/submit
 * Teacher submits a material for marketplace sharing.
 *
 * AUTH: Teacher only
 * BODY: { materialType, contentId, showAuthorName, tags }
 *
 * The content is copied from the teacher's own lesson plan / SBA task
 * into the SharedMaterial table with status: "pending".
 * HOD is notified to review.
 */
```

Create `app/api/marketplace/[id]/download/route.js`:

```javascript
/**
 * POST /api/marketplace/:id/download
 * Teacher downloads a shared material into their own library.
 *
 * AUTH: Any authenticated teacher
 * Creates a copy of the SharedMaterial as the teacher's own lesson plan / SBA task
 * Increments downloadCount on the SharedMaterial
 */
```

### 29.3 Create marketplace UI

Create `app/marketplace/page.js`:

- Search bar with subject/form/type filters
- Grid of material cards showing: title, subject, form, type, rating, download count
- Each card links to a preview page

Create `app/marketplace/[id]/page.js`:

- Full material preview
- "Download to my library" button
- Rating and comments section

Create `app/dashboard/teacher/marketplace/my-submissions/page.js`:

- List of teacher's submitted materials with approval status
- "Submit this lesson plan" button linking from lesson plan list

---

## TASK 30 — In-App School Fees Collection (Week 3–4, ~3 days)

### Why this matters

The Lipila mobile money integration already handles platform subscriptions.
The same infrastructure can handle school fees — parents pay via MTN/Airtel/Zamtel
directly through the school's ZSMS portal.

### 30.1 Add fee management Prisma models

Add to `prisma/schema.prisma`:

```prisma
model FeeStructure {
  id            String   @id @default(cuid())
  schoolId      String
  name          String   // e.g. "Term 1 Tuition 2025"
  amount        Float    // In ZMW (Kwacha)
  term          Int?     // 1 | 2 | 3
  academicYear  String
  dueDate       DateTime
  gradeOrForm   String?  // null = applies to all
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  payments      FeePayment[]
  school        School   @relation(fields: [schoolId], references: [id])
}

model FeePayment {
  id              String   @id @default(cuid())
  schoolId        String
  studentId       String
  feeStructureId  String
  amount          Float
  currency        String   @default("ZMW")
  // Lipila integration
  lipilaReference String?  @unique
  paymentMethod   String?  // "MtnMoney" | "AirtelMoney" | "ZamtelKwacha"
  status          String   @default("pending") // pending | paid | failed | refunded
  paidAt          DateTime?
  receiptNumber   String?  @unique
  // Parent contact
  paidByPhone     String?  // Parent mobile number
  paidByName      String?
  createdAt       DateTime @default(now())

  school          School       @relation(fields: [schoolId], references: [id])
  student         User         @relation(fields: [studentId], references: [id])
  feeStructure    FeeStructure @relation(fields: [feeStructureId], references: [id])

  @@index([schoolId, studentId])
  @@index([lipilaReference])
}
```

### 30.2 Create fee collection API

Create `app/api/fees/pay/route.js`:

```javascript
/**
 * POST /api/fees/pay
 *
 * Parent initiates fee payment via Lipila mobile money.
 * Uses existing lib/payments/lipila.js — same flow as subscription payment.
 *
 * AUTH: Parent (or unauthenticated with student ID + verification code)
 * BODY: { studentId, feeStructureId, phoneNumber, provider }
 *
 * FLOW:
 * 1. Validate fee structure belongs to student's school
 * 2. Check student is not already paid for this fee
 * 3. Create pending FeePayment record
 * 4. Call Lipila payment initiation
 * 5. Parent enters PIN on their phone
 * 6. Lipila calls /api/fees/lipila/callback
 * 7. Callback marks payment as paid and sends SMS receipt
 */
```

Create `app/api/fees/lipila/callback/route.js`:

```javascript
/**
 * POST /api/fees/lipila/callback
 *
 * Lipila webhook for fee payments.
 * Same security pattern as onboarding payment callback.
 *
 * SECURITY:
 * - Validate Lipila signature
 * - Idempotent: safe to call multiple times with same referenceId
 * - Records the raw webhook payload for audit purposes
 */
```

### 30.3 Create fee management UI

Create `app/dashboard/headteacher/fees/page.js`:

- Fee structure setup (create terms, amounts, due dates)
- Payment status overview — which students have paid, which haven't
- Export arrears list for follow-up
- SMS reminder to parents of unpaid fees (uses Africa's Talking)

Create `app/dashboard/student/fees/page.js`:

- Student's own fee balance
- Payment history with receipts
- "Pay now" button (for parent)

---

## TASK 31 — Expo Mobile Feature Expansion (Week 4, ~3 days)

### 31.1 Student mobile app features

In `zsms-mobile/`, add student-facing screens:

```
zsms-mobile/app/
├── (student)/
│   ├── timetable/     — Today's and weekly timetable
│   ├── results/       — SBA scores and term results
│   ├── ecz-practice/  — ECZ practice questions (uses RAG)
│   └── notices/       — School announcements
```

Create the timetable screen using existing `/api/timetable` endpoint.
Create the results screen using existing `/api/results` endpoint.

### 31.2 Push notifications

Install in `zsms-mobile/`:

```bash
npx expo install expo-notifications expo-device expo-constants
```

Create `zsms-mobile/lib/notifications.js`:

```javascript
/**
 * Push notification setup for ZSMS mobile app.
 *
 * FREE: Expo Push Notifications are free up to 1,000,000 notifications/month.
 * They work on both iOS and Android.
 *
 * NOTIFICATIONS SENT:
 * - Results published (student)
 * - New school announcement (student + teacher)
 * - Attendance session opened (teacher)
 * - SBA deadline approaching (teacher)
 * - Fee payment due (student → parent sees it)
 */
```

### 31.3 Offline lesson plan access for teachers

Teachers should be able to read their approved lesson plans offline.
In `zsms-mobile/`, add lesson plan caching:

- On app open (while online): sync all teacher's lesson plans to local SQLite
- Offline: read from SQLite cache
- Create mode offline: save draft to SQLite, sync when back online

---

## TASK 32 — National Assessment Platform (Week 4–5, ~3 days)

### 32.1 ECZ-style mock examinations

The RAG system (already implemented) provides curriculum-grounded questions.
This task adds a structured mock examination flow.

Create `app/dashboard/student/mock-exam/page.js`:

```javascript
/**
 * Student Mock Examination Interface
 *
 * FLOW:
 * 1. Student selects subject and form
 * 2. System generates an ECZ-aligned exam paper (via AI + RAG)
 * 3. Student answers questions (timed — 2 hours for most subjects)
 * 4. System scores structured/calculation answers automatically
 * 5. Extended responses flagged for teacher review
 * 6. Student sees score, correct answers, and explanations
 *
 * EXAM RULES (ECZ-aligned):
 * - No multiple choice at secondary (Forms 1-4)
 * - Scenario-based questions only
 * - Uses ECZ command terms (State, Define, Explain, Calculate, etc.)
 * - Marks allocated by cognitive level (Bloom's taxonomy)
 */
```

### 32.2 Auto-scoring for structured answers

Create `lib/assessment/auto-scorer.js`:

```javascript
/**
 * Auto-scoring for mock examination answers.
 *
 * WHAT CAN BE AUTO-SCORED:
 * - Mathematical calculations (exact match or within tolerance)
 * - Definition questions (key terms present check)
 * - State/List questions (count of valid items)
 * - Multiple step problems (partial credit per step)
 *
 * WHAT REQUIRES TEACHER REVIEW:
 * - Explain questions (requires judgment)
 * - Evaluate/Analyse questions (open-ended)
 * - Extended responses (essays, arguments)
 *
 * USES GROQ: For AI-assisted marking of extended responses.
 * Teacher still confirms before score is recorded.
 */
```

### 32.3 National percentile tracking (anonymised)

This gives students a sense of where they stand nationally without exposing individual identities.

Create `app/api/analytics/national-percentile/route.js`:

```javascript
/**
 * GET /api/analytics/national-percentile
 *
 * Returns anonymous national percentile for a student's mock exam score.
 * Used to motivate students: "You scored in the top 30% nationally."
 *
 * PRIVACY:
 * - No individual student data shared
 * - Scores are bucketed (0-10, 10-20, ..., 90-100)
 * - Only aggregated distributions returned
 * - Students identified by random national ID — never name/school
 *
 * AUTH: Student only — their own percentile
 */
```

---

## TASK 33 — Phase 4 Docs + Phase 5 Roadmap (Week 5, ~2 days)

### 33.1 Run full test suite

```bash
npm test                # All Vitest tests (target: 70+ by Phase 4)
npm run test:e2e        # All Playwright E2E tests
npm run build           # Zero errors
npm run audit:security  # No HIGH/CRITICAL vulnerabilities
```

### 33.2 Create security documentation

Create `docs/SECURITY.md` — the master security reference:

```markdown
# ZSMS Security Documentation

## Threat Model

Who might attack ZSMS and what they want:

1. Students trying to change their own grades
2. External attackers trying to steal student data
3. One school's administrator trying to access another school's data
4. Automated bots trying credential stuffing on login
5. Insiders (disgruntled teachers) abusing their access

## Security Architecture

- Dual-layer auth: proxy.js (first pass) + verifyAuth() in route handlers (authoritative)
- Multi-tenant isolation: RLS + Zod validation rejecting cross-tenant requests
- Input validation: Zod schemas on every mutation endpoint
- Output encoding: React handles XSS prevention in rendered output
- Transport security: HTTPS enforced via HSTS header
- Cookie security: HttpOnly + Secure + SameSite=Strict

## Known CVEs and Mitigations

- CVE-2025-29927 (Next.js middleware bypass): Patched to Next.js 15.2.3+
  AND x-middleware-subrequest stripped at proxy.js

## Security Checklist for New Features

Before merging any PR that adds an API route:
□ verifyAuth() called inside the route handler (not just middleware)
□ validateBody() with Zod schema on all POST/PUT/PATCH/DELETE
□ schoolId taken from JWT, never from request body
□ Sensitive data not logged (passwords, tokens, payment details)
□ New tenant-scoped table added to RLS migration
□ Test added for unauthenticated access (should return 401)
□ Test added for wrong-school access (should return 403 or empty)
```

Create `docs/PENETRATION_TEST_PLAN.md`:

- Manual test scenarios for each security layer
- How to run OWASP ZAP against the staging environment
- How to use the tenant isolation tests

### 33.3 Update CHANGELOG

```markdown
## [4.0.0] - 2026-XX-XX

### Phase 4 — Security Hardening + Scale and Ecosystem

#### Security (Track A)

- CVE-2025-29927 patched: Next.js upgraded to 15.2.3+, x-middleware-subrequest stripped at proxy
- Dual-layer auth: all protected API routes now have server-side verifyAuth() checks
- Zod input validation: all POST/PUT/PATCH/DELETE routes validated against schemas
- CSP headers: Content-Security-Policy with strict-dynamic added to all routes
- Dangerous headers stripped at proxy (7 internal headers blocked from external requests)
- Dependabot automated dependency scanning enabled
- GitHub Actions security audit runs on every PR
- JWT hardened: 15-minute access tokens, refresh token rotation
- HttpOnly+Secure+SameSite=Strict enforced on all auth cookies
- Multi-tenant penetration tests: 6 cross-tenant attack scenarios covered

#### Features (Track B)

- Teaching materials marketplace: share and discover ECZ-aligned materials
- In-app school fees: Lipila mobile money for fee collection
- Expo mobile: student timetable, results, push notifications
- National mock examinations: ECZ-style, auto-scored, anonymous percentile tracking

#### Documentation

- SECURITY.md: master security reference and new-feature checklist
- PENETRATION_TEST_PLAN.md: manual testing scenarios
- SECRET_ROTATION.md: instructions for rotating all secrets
```

### 33.4 Create `docs/PHASE5_ROADMAP.md`

```markdown
# Phase 5 — National Scale

## Overview

Phase 5 targets district-level rollout and Ministry of Education integration.

## P5.1 — Ministry of Education API Integration

- Automated MOE term-end reporting
- National STEM monitoring pipeline
- Direct integration with MOE Management Information System

## P5.2 — Multi-Province DEBS Dashboard

- Provincial Education Officer cross-district view
- National attendance heat map
- Cross-district SBA performance comparison

## P5.3 — CompreFace Face Recognition Upgrade

- Replace custom face matching with CompreFace Docker service
- GPU-optional, high accuracy
- Liveness detection (prevents photo spoofing)
- Batch enrollment for new school year

## P5.4 — Financial Sustainability

- Fee collection commissions (platform takes 0.5% of fees processed)
- Premium tier features: advanced analytics, white-label reports
- District licensing (DEBS pays one fee for all schools in district)

## Revenue milestone before Phase 5:

Target: 50 active schools × K800/month = K40,000/month
This covers infrastructure costs + 2 full-time developers
```

---

## PHASE 4 FINAL CHECKLIST

Run this before declaring Phase 4 complete:

```bash
# 1. Security: All tests pass including security tests
npm test
# Expected: 70+ tests, including security/ directory tests

# 2. No HIGH/CRITICAL dependency vulnerabilities
npm run audit:security
# Expected: 0 vulnerabilities at HIGH or CRITICAL level

# 3. CVE patch verified
cat package.json | grep '"next"'
# Expected: version >= 15.2.3

# 4. CSP headers present
curl -I http://localhost:3000 | grep -i "content-security-policy"
# Expected: header present with strict-dynamic

# 5. x-middleware-subrequest bypass blocked
curl -H "x-middleware-subrequest: middleware" http://localhost:3000/api/dashboard/headteacher
# Expected: 401 (not 200 — the bypass does not work)

# 6. Auth cookie flags verified
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}' 2>&1 | grep -i "set-cookie"
# Expected: HttpOnly; Secure; SameSite=Strict on the token cookie

# 7. Input validation blocks role escalation
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Cookie: zsms_token=VALID_TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","role":"headteacher"}'
# Expected: 403 or role unchanged in DB

# 8. Cross-tenant isolation
# See __tests__/security/tenant-isolation.test.js — all must pass

# 9. E2E tests pass
npm run test:e2e

# 10. Build succeeds
npm run build

# 11. Marketplace works
# Visit /marketplace — should show shared materials without login

# 12. Documentation complete
ls docs/ | wc -l
# Expected: 22+ files
```

---

## CRITICAL NOTES FOR CURSOR

1. **Track A (security) MUST complete before Track B features ship.** Do not start Task 29 until Tasks 23–28 are all done and tested.

2. **The x-middleware-subrequest block in proxy.js must be the very first thing executed** — before any routing, auth check, or logging. A single line in the wrong position defeats its purpose.

3. **Zod schemas must NEVER include `role` or `schoolId` as accepted fields on user-facing mutation endpoints.** These always come from the verified JWT — never from the request body.

4. **JWT algorithm must be explicit `HS256`.** The 'none' algorithm attack is real — without explicit algorithm specification, some JWT libraries accept `{"alg":"none"}` tokens which have no signature.

5. **Dependabot PRs should not be auto-merged.** They create PRs for review — a developer must verify the update doesn't break anything before merging.

6. **The marketplace must NOT expose which school created a material.** Only province/district is shown. Teachers can opt-in to show their name, but school identity is always hidden to prevent competitive concerns between schools.

7. **Fee payments use the existing Lipila client.** Do not create a new payment integration. The same `lib/payments/lipila.js` file handles both subscription payments and fee payments — just different endpoints and amount fields.
