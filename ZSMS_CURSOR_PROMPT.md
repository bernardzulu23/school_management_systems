# ZSMS — Cursor Agent Execution Prompt

## Full PRD v1 Implementation

**Project:** Zambian School Management System (ZSMS)
**Stack:** Next.js 16 App Router · React 19 · PostgreSQL/Prisma 6 · Neon · JWT Auth · Groq AI (FREE tier) · Africa's Talking SMS · Lipila Mobile Money · Expo Mobile
**Hosting:** Vercel (free plan) + Neon PostgreSQL

---

## ⚠️ CRITICAL RULES BEFORE YOU WRITE A SINGLE LINE

1. **NEVER install `@ai-sdk/anthropic`, `@ai-sdk/openai`, or any paid AI provider.** Only `@ai-sdk/groq` which uses the existing free Groq API key already in `.env`.
2. **NEVER add any service that charges per request or per token beyond what is already in the project.** The only AI cost is Groq — it is free up to 14,400 requests/day.
3. **DO NOT break existing functionality.** Every change must be backwards compatible. Run `npm run build` after every major change and fix any errors before continuing.
4. **After every completed task, update `CHANGELOG.md` and the relevant `docs/` file** with what was changed, why, and how it works.
5. **Add JSDoc comments to every new function, class, and API route you create.**
6. **If you are unsure about an existing behaviour, read the file first — do not guess.**

---

## PHASE 1 EXECUTION PLAN

Execute these tasks in order. Do not skip ahead. Complete each task fully before starting the next.

---

## TASK 1 — Environment Validation (Day 1, ~2 hours)

### 1.1 Create `lib/config/env.js`

Create a new file that validates all required environment variables on application startup using plain JavaScript validation (no external library needed — keep it zero-cost):

```javascript
// lib/config/env.js
/**
 * Environment variable validation for ZSMS.
 *
 * Runs at startup. If any required variable is missing, the app
 * throws a clear error message instead of a cryptic 500 at runtime.
 *
 * HOW IT WORKS:
 * - Import this file at the top of app/layout.js (server component)
 * - It reads process.env and validates each variable
 * - Missing required vars throw with a helpful message
 * - Optional vars log a warning
 *
 * ADDING NEW VARS:
 * - Add to REQUIRED or OPTIONAL object below
 * - Add a description so future devs know what it does
 */

const REQUIRED = {
  DATABASE_URL: 'Neon PostgreSQL connection string',
  JWT_SECRET: 'Secret for signing JWT tokens (min 32 chars)',
  RESEND_API_KEY: 'Resend email API key (re_...)',
  EMAIL_FROM: 'From address for emails (e.g. noreply@yourdomain.com)',
  GROQ_API_KEY: 'Groq AI API key (gsk_...)',
}

const OPTIONAL = {
  LIPILA_API_KEY: 'Lipila mobile money API key — payments disabled if missing',
  LIPILA_BASE_URL: 'Lipila API base URL — defaults to production',
  AFRICASTALKING_API_KEY: "Africa's Talking API key — SMS disabled if missing",
  AFRICASTALKING_USERNAME: "Africa's Talking username",
  COOKIE_DOMAIN: 'Cookie domain for multi-tenant subdomains',
  APP_BASE_DOMAIN: 'Base domain (e.g. bluepeacktechnologies.com)',
  DIRECT_URL: 'Neon direct connection URL for migrations',
  ALLOW_DIRECT_SCHOOL_REGISTRATION: 'Set to "true" to allow direct registration (dev only)',
}

export function validateEnv() {
  const missing = []
  const warnings = []

  for (const [key, description] of Object.entries(REQUIRED)) {
    if (!process.env[key]) {
      missing.push(`  ❌ ${key} — ${description}`)
    }
  }

  for (const [key, description] of Object.entries(OPTIONAL)) {
    if (!process.env[key]) {
      warnings.push(`  ⚠️  ${key} — ${description} (feature disabled)`)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n\nZSMS startup failed — missing required environment variables:\n${missing.join('\n')}\n\nAdd these to your .env.local file or Vercel environment settings.\nSee docs/SETUP.md for the full variable reference.\n`
    )
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `\nZSMS optional env vars not set (features will be disabled):\n${warnings.join('\n')}\n`
    )
  }
}

export const env = {
  // Auth
  jwtSecret: process.env.JWT_SECRET,
  cookieDomain: process.env.COOKIE_DOMAIN,

  // Email
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,

  // AI (Groq — FREE tier, 14,400 req/day)
  groqApiKey: process.env.GROQ_API_KEY,

  // Payments
  lipilaApiKey: process.env.LIPILA_API_KEY,
  lipilaBaseUrl: process.env.LIPILA_BASE_URL || 'https://api.lipila.net',

  // SMS
  atApiKey: process.env.AFRICASTALKING_API_KEY,
  atUsername: process.env.AFRICASTALKING_USERNAME,

  // App
  baseDomain: process.env.APP_BASE_DOMAIN || process.env.BASE_DOMAIN,
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Feature flags (derived from presence of API keys)
  features: {
    payments: !!process.env.LIPILA_API_KEY,
    sms: !!process.env.AFRICASTALKING_API_KEY,
    ai: !!process.env.GROQ_API_KEY,
    email: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
  },
}
```

### 1.2 Wire env validation

In `app/layout.js` (root server layout), add at the very top:

```javascript
import { validateEnv } from '@/lib/config/env'
// Validate on startup — throws if required vars missing
if (typeof window === 'undefined') {
  validateEnv()
}
```

### 1.3 Create `.env.example`

Create `.env.example` in the project root with every variable documented:

```
# ============================================
# ZSMS Environment Variables
# Copy this file to .env.local and fill in values
# See docs/SETUP.md for detailed instructions
# ============================================

# --- DATABASE (Required) ---
DATABASE_URL=postgresql://...          # Neon PostgreSQL connection string
DIRECT_URL=postgresql://...            # Neon direct URL for migrations

# --- AUTH (Required) ---
JWT_SECRET=                            # Min 32 chars random string

# --- EMAIL (Required) ---
RESEND_API_KEY=re_...                  # Get from resend.com (free tier: 3,000/month)
EMAIL_FROM=noreply@yourdomain.com      # Must be verified in Resend

# --- AI (Required for AI features) ---
GROQ_API_KEY=gsk_...                   # Get from console.groq.com (FREE: 14,400 req/day)

# --- PAYMENTS (Optional — payments disabled if missing) ---
LIPILA_API_KEY=                        # Zambia mobile money (Lipila)
LIPILA_BASE_URL=https://api.lipila.net

# --- SMS (Optional — SMS disabled if missing) ---
AFRICASTALKING_API_KEY=               # Africa's Talking (free sandbox available)
AFRICASTALKING_USERNAME=              # Your Africa's Talking username

# --- APP ---
APP_BASE_DOMAIN=bluepeacktechnologies.com
COOKIE_DOMAIN=.bluepeacktechnologies.com
ALLOW_DIRECT_SCHOOL_REGISTRATION=false
```

### 1.4 Create health endpoint

Create `app/api/health/route.js`:

```javascript
/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and deployment verification.
 * Returns status of: database, email (Resend), AI (Groq), SMS, payments.
 *
 * Used by:
 * - Vercel deployment checks
 * - Uptime monitoring
 * - Admin dashboard status widget
 *
 * Returns 200 if database is reachable, 503 otherwise.
 * Individual service failures return 200 with that service marked degraded.
 */
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/config/env'

export async function GET() {
  const checks = {
    database: false,
    email: env.features.email,
    ai: env.features.ai,
    sms: env.features.sms,
    payments: env.features.payments,
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (e) {
    checks.database = false
  }

  const allHealthy = checks.database

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.3',
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
```

**Documentation to write:** After completing Task 1, create `docs/ENVIRONMENT.md` with:

- Full table of every env variable, what it does, where to get it, and whether it's required
- Instructions for local setup
- Instructions for Vercel deployment

---

## TASK 2 — Observability: Sentry + Structured Logging (Day 1–2, ~3 hours)

### 2.1 Wire Sentry

`@sentry/nextjs` is already installed. Wire it up:

1. Create `sentry.client.config.js` in project root:

```javascript
/**
 * Sentry client-side configuration.
 * Captures unhandled browser errors and sends to Sentry dashboard.
 * Only active in production (NODE_ENV === 'production').
 *
 * SENTRY_DSN must be set in environment variables.
 * Get DSN from: sentry.io → Project Settings → Client Keys
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1, // 10% of transactions — keeps within free tier
  // Ignore common non-critical errors
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Non-Error promise rejection captured'],
})
```

2. Create `sentry.server.config.js`:

```javascript
/**
 * Sentry server-side configuration.
 * Captures API route errors, database errors, and unhandled rejections.
 *
 * IMPORTANT: schoolId and userId are added to every error for context.
 * Sensitive data (passwords, tokens) are NEVER sent to Sentry.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
})
```

3. Create `sentry.edge.config.js` (identical to server config for edge routes).

4. Add to `.env.example`:

```
# --- MONITORING (Optional but strongly recommended) ---
SENTRY_DSN=                           # sentry.io free tier: 5,000 errors/month
NEXT_PUBLIC_SENTRY_DSN=               # Same value — used in browser
```

### 2.2 Add structured logging utility

Create `lib/utils/logger.js`:

```javascript
/**
 * Structured logger for ZSMS API routes.
 *
 * WHY: console.log() produces unstructured output that is hard to search
 * in Vercel logs. This logger adds context (schoolId, userId, route, duration)
 * to every log entry so you can filter by school or user in production.
 *
 * USAGE:
 *   import { logger } from '@/lib/utils/logger';
 *   const log = logger({ schoolId, userId, route: '/api/lesson-plans' });
 *   log.info('Generating lesson plan', { subject, form });
 *   log.error('Groq API failed', { error: e.message });
 *
 * OUTPUT FORMAT (JSON in production, pretty in development):
 *   {"level":"info","schoolId":"cl...","route":"/api/lesson-plans","msg":"Generating lesson plan","subject":"Mathematics I","form":"Form 2"}
 */

const isDev = process.env.NODE_ENV !== 'production'

function formatEntry(level, context, message, data = {}) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...context,
    msg: message,
    ...data,
  }

  if (isDev) {
    const icon = { info: 'ℹ️', warn: '⚠️', error: '❌', debug: '🔍' }[level] || '•'
    const ctx = context.schoolId ? `[${context.schoolId?.slice(-6)}]` : ''
    const route = context.route ? ` ${context.route}` : ''
    console.log(`${icon}${ctx}${route} ${message}`, Object.keys(data).length ? data : '')
  } else {
    // Production: JSON for log aggregation
    console.log(JSON.stringify(entry))
  }
}

export function logger(context = {}) {
  return {
    info: (message, data) => formatEntry('info', context, message, data),
    warn: (message, data) => formatEntry('warn', context, message, data),
    error: (message, data) => formatEntry('error', context, message, data),
    debug: (message, data) => isDev && formatEntry('debug', context, message, data),

    /** Log API request start — call at top of route handler */
    request: (req) =>
      formatEntry('info', context, `${req.method} ${context.route}`, {
        userAgent: req.headers.get?.('user-agent')?.slice(0, 50),
      }),

    /** Log API request completion — call before returning response */
    response: (status, durationMs) =>
      formatEntry('info', context, `Response ${status}`, {
        status,
        durationMs,
      }),
  }
}

/**
 * Capture error in Sentry with school context.
 * Use this instead of console.error in API routes.
 *
 * @param {Error} error
 * @param {Object} context - { schoolId, userId, route, ...extra }
 */
export function captureError(error, context = {}) {
  formatEntry('error', context, error.message, {
    stack: isDev ? error.stack : undefined,
    code: error.code,
  })

  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const Sentry = require('@sentry/nextjs')
      Sentry.withScope((scope) => {
        if (context.schoolId) scope.setTag('schoolId', context.schoolId)
        if (context.userId) scope.setUser({ id: context.userId })
        if (context.route) scope.setTag('route', context.route)
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v))
        Sentry.captureException(error)
      })
    } catch (e) {
      // Sentry not configured — fail silently
    }
  }
}
```

### 2.3 Add logging to the 5 highest-traffic API routes

Add logging to these routes (they are the most critical paths):

- `app/api/auth/login/route.js`
- `app/api/onboarding/complete/route.js`
- `app/api/onboarding/lipila/callback/route.js`
- `app/api/lesson-plans/generate/route.js` (or equivalent AI route)
- `app/api/dashboard/headteacher/route.js`

For each, add at the top:

```javascript
import { logger, captureError } from '@/lib/utils/logger'
// Inside handler:
const log = logger({ schoolId, userId, route: '/api/auth/login' })
const start = Date.now()
log.request(req)
// ... existing logic ...
log.response(200, Date.now() - start)
```

**Documentation to write:** After Task 2, add a section to `docs/DEVELOPER_GUIDE.md`: "How to add logging to a new API route" with a copy-paste template.

---

## TASK 3 — Test Infrastructure (Day 2–3, ~3 hours)

### 3.1 Install test dependencies

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom msw
```

### 3.2 Create `vitest.config.js`

```javascript
/**
 * Vitest configuration for ZSMS.
 *
 * Uses jsdom environment for component tests.
 * Server-side tests (API routes) use node environment.
 *
 * HOW TO RUN:
 *   npm test           — run all tests once
 *   npm run test:watch — watch mode for development
 *   npm run test:ui    — browser UI for test results
 *
 * WHERE TO PUT TESTS:
 *   __tests__/unit/     — pure function tests
 *   __tests__/api/      — API route tests (mocked DB + external services)
 *   __tests__/e2e/      — Playwright end-to-end (separate config)
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**', 'app/api/**'],
      exclude: ['**/*.test.js', '**/__mocks__/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

### 3.3 Create `__tests__/setup.js`

```javascript
/**
 * Global test setup for ZSMS.
 * Runs before every test file.
 *
 * Sets up:
 * - Environment variables (test values)
 * - MSW server for API mocking
 * - Prisma mock
 */
import { vi } from 'vitest'

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/zsms_test'
process.env.RESEND_API_KEY = 're_test_key'
process.env.EMAIL_FROM = 'test@test.com'
process.env.GROQ_API_KEY = 'gsk_test_key'
process.env.NODE_ENV = 'test'

// Mock Prisma — tests should not touch a real database
vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    onboarding: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    sBAScore: { findMany: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction: vi.fn((fn) => fn(prisma)),
  },
}))
```

### 3.4 Write the 4 critical path tests

Create `__tests__/api/auth.test.js`:

```javascript
/**
 * Tests for POST /api/auth/login
 *
 * CRITICAL PATH: If login breaks, no teacher or student can access the platform.
 * These tests must pass before ANY deployment.
 *
 * What we test:
 * 1. Correct credentials → 200 + JWT cookie set
 * 2. Wrong password → 401
 * 3. Non-existent user → 401 (same error message — no user enumeration)
 * 4. Missing fields → 400
 * 5. Inactive school (trial expired) → 403
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
// ... full test implementation
```

Create `__tests__/api/onboarding.test.js`:

```javascript
/**
 * Tests for onboarding payment gate
 *
 * CRITICAL PATH: This is the revenue gate.
 * A bug here either lets schools in for free or blocks paying customers.
 *
 * What we test:
 * 1. POST /api/onboarding/complete with paymentStatus='paid' → 200, school created
 * 2. POST /api/onboarding/complete with paymentStatus='pending' → 402, school NOT created
 * 3. POST /api/onboarding/complete with paymentStatus='failed' → 402
 * 4. POST /api/onboarding/lipila/callback with valid Lipila payload → marks school as paid
 * 5. POST /api/onboarding/lipila/callback with invalid payload → 400, no state change
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
// ... full test implementation
```

Create `__tests__/api/sba.test.js`:

```javascript
/**
 * Tests for SBA (School-Based Assessment) API
 *
 * ECZ COMPLIANCE: These tests verify the platform follows ECZ regulations:
 * - SBA cannot be created for Form 4 learners
 * - SBA scores are out of 100
 * - 31 January deadline is correctly calculated
 *
 * What we test:
 * 1. POST /api/sba/tasks — Form 1,2,3 succeeds
 * 2. POST /api/sba/tasks — Form 4 returns 403 with clear message
 * 3. POST /api/sba/scores — total correctly computed (task1+task2+task3+termTest ≤ 100)
 * 4. GET /api/sba/submission-deadline — returns correct Jan 31 date
 */
import { describe, it, expect, vi } from 'vitest'
// ... full test implementation
```

Create `__tests__/api/ecz.test.js`:

```javascript
/**
 * Tests for ECZ submission API
 *
 * What we test:
 * 1. ECZ submission contains all required fields
 * 2. Submission is blocked if not all learner scores are present
 * 3. Submission deadline is enforced
 * 4. PE subject uses 40% SBA weight, all others use 30%
 */
import { describe, it, expect, vi } from 'vitest'
// ... full test implementation
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

**Documentation to write:** After Task 3, add `docs/TESTING.md` with: how to run tests, how to write a new test, how to mock Prisma/external services, what the coverage targets are.

---

## TASK 4 — AI Layer Migration to Vercel AI SDK (FREE — Groq only) (Week 2, ~4 days)

### ⚠️ COST CLARITY — READ BEFORE IMPLEMENTING

**FREE packages to install:**

```bash
npm install ai @ai-sdk/groq zod
```

**DO NOT install:**

- ❌ `@ai-sdk/anthropic` — paid per token
- ❌ `@ai-sdk/openai` — paid per token
- ❌ Any other AI provider SDK

**COST BREAKDOWN:**

- `ai` package: £0 (MIT licence, npm package)
- `@ai-sdk/groq`: £0 (MIT licence, npm package)
- Groq API usage: £0 up to 14,400 requests/day on free tier
- Total new AI cost: **£0**

### 4.1 Install packages

```bash
npm install ai @ai-sdk/groq zod
```

### 4.2 Create Zod schemas for all AI-generated content

Create `lib/ai/schemas.js`:

```javascript
/**
 * Zod schemas for all AI-generated content in ZSMS.
 *
 * WHY ZOD SCHEMAS:
 * Before: AI generates a markdown string. We store it as text.
 *         If the AI returns garbage, we don't know until a teacher sees it.
 * After:  AI generates a typed object. Zod validates the structure.
 *         If the AI returns garbage, we get a validation error and retry.
 *         The lesson plan is stored as structured JSON — renderable, searchable, editable.
 *
 * HOW TO ADD A NEW SCHEMA:
 * 1. Define the Zod schema below
 * 2. Export it
 * 3. Use it with generateObject() in the corresponding AI function
 * 4. Add the TypeScript equivalent type if needed
 */
import { z } from 'zod'

// ─── ECZ RUBRIC ──────────────────────────────────────────────────────────────
/**
 * ECZ 4-level rubric schema.
 * Follows the official ECZ assessment guidelines (2023 ZECF).
 * Levels: Excellent(4) Good(3) Fair(2) NeedsImprovement(1)
 */
export const RubricCriterionSchema = z.object({
  name: z.string().min(3).max(100).describe('Name of the assessment criterion'),
  description: z.string().max(200).describe('What this criterion measures'),
  excellent: z.string().min(10).describe('Descriptor for Excellent (4 marks)'),
  good: z.string().min(10).describe('Descriptor for Good (3 marks)'),
  fair: z.string().min(10).describe('Descriptor for Fair (2 marks)'),
  needsImprovement: z.string().min(10).describe('Descriptor for Needs Improvement (1 mark)'),
})

export const RubricSchema = z.object({
  taskTitle: z.string(),
  subject: z.string(),
  form: z.enum(['Form 1', 'Form 2', 'Form 3']), // Never Form 4
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
  criteria: z.array(RubricCriterionSchema).min(2).max(8),
  zambiaCurriculumAlignment: z.string().describe('Which ECZ competencies this task develops'),
})

// ─── LESSON PLAN ──────────────────────────────────────────────────────────────
/**
 * CBC-aligned lesson plan schema.
 * Based on Zambia's 2023 ZECF CBC framework.
 */
export const LessonObjectiveSchema = z.object({
  objective: z.string().min(10),
  bloomsLevel: z.enum([
    'Remembering',
    'Understanding',
    'Applying',
    'Analysing',
    'Evaluating',
    'Creating',
  ]),
  competency: z.string(), // One of the 12 ECZ competencies
})

export const LessonActivitySchema = z.object({
  phase: z.enum(['Introduction', 'Development', 'Conclusion']),
  durationMinutes: z.number().min(2).max(60),
  activity: z.string().min(20),
  teacherAction: z.string(),
  learnerAction: z.string(),
  resources: z.array(z.string()),
  zambiaCulturalContext: z.string().optional(),
})

export const LessonPlanSchema = z.object({
  title: z.string(),
  subject: z.string(),
  gradeOrForm: z.string(),
  duration: z.number().describe('Total duration in minutes'),
  objectives: z.array(LessonObjectiveSchema).min(1).max(5),
  priorKnowledge: z.string(),
  materialsRequired: z.array(z.string()),
  activities: z.array(LessonActivitySchema).min(2).max(8),
  assessment: z.object({
    method: z.string(),
    tool: z.string(),
    criteria: z.string(),
  }),
  crossCuttingThemes: z.array(z.string()),
  coreCompetencies: z.array(z.string()).min(1).max(3),
  realWorldZambianContext: z.string(),
  teacherReflectionPrompts: z.array(z.string()).max(3),
})

// ─── ECZ EXAM QUESTION ───────────────────────────────────────────────────────
/**
 * ECZ exam question schema.
 * RULES (from ECZ Assessment Guidelines 2023):
 * - No multiple choice at secondary level (Forms 1-4)
 * - All questions must be scenario-based with Zambian context
 * - Questions must use official ECZ command terms
 */
export const ECZSubQuestionSchema = z.object({
  number: z.string().describe('e.g. (a), (b), (i), (ii)'),
  commandTerm: z.enum([
    'State',
    'List',
    'Define',
    'Describe',
    'Explain',
    'Calculate',
    'Compare',
    'Contrast',
    'Analyse',
    'Evaluate',
    'Design',
    'Justify',
    'Synthesise',
    'Discuss',
    'Identify',
    'Outline',
    'Summarise',
  ]),
  question: z.string(),
  marks: z.number().min(1).max(20),
  bloomsLevel: z.enum([
    'Remembering',
    'Understanding',
    'Applying',
    'Analysing',
    'Evaluating',
    'Creating',
  ]),
  modelAnswer: z.string().describe('Mark scheme / model answer'),
})

export const ECZExamQuestionSchema = z.object({
  questionNumber: z.number(),
  zambianScenario: z.string().min(30).describe('Real-life Zambian context (2-4 sentences)'),
  subject: z.string(),
  form: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4']),
  elementOfConstruct: z.string().describe('Which ECZ element of construct this assesses'),
  subQuestions: z.array(ECZSubQuestionSchema).min(2).max(6),
  totalMarks: z.number(),
  hasMultipleChoice: z.literal(false).describe('NEVER true at secondary level'),
})

// ─── SBA TASK ────────────────────────────────────────────────────────────────
export const SBATaskSchema = z.object({
  title: z.string(),
  subject: z.string(),
  form: z.enum(['Form 1', 'Form 2', 'Form 3']), // NOT Form 4
  taskType: z.string(),
  // ECZ 5-part structure
  context: z.string().min(30).describe('Real-life Zambian scenario'),
  task: z.string().min(30).describe('Clear instructions for learner'),
  materialsProvided: z.array(z.string()),
  rubric: RubricSchema,
  demonstration: z.string().describe('What learner must show after completing task'),
  // Metadata
  competencies: z.array(z.string()).min(1),
  crossCuttingThemes: z.array(z.string()),
  estimatedDurationMinutes: z.number(),
  resourceLevel: z.enum(['low', 'moderate', 'well-resourced']),
})

// ─── REPORT COMMENT ──────────────────────────────────────────────────────────
export const ReportCommentSchema = z.object({
  subject: z.string(),
  studentName: z.string(),
  termComment: z.string().min(30).max(300).describe('Professional end-of-term comment'),
  strengths: z.array(z.string()).max(3),
  areasForGrowth: z.array(z.string()).max(2),
  recommendedActions: z.string().max(200),
  cbcCompetenciesEvidenced: z.array(z.string()),
})
```

### 4.3 Create AI client

Create `lib/ai/client.js`:

```javascript
/**
 * ZSMS AI Client — Groq (FREE tier)
 *
 * COST: £0 — Groq free tier allows 14,400 requests/day
 * MODEL: llama-3.3-70b-versatile — Groq's best free model
 *
 * WHY VERCEL AI SDK INSTEAD OF RAW FETCH:
 * - Streaming works with proper backpressure (no memory issues)
 * - generateObject() validates output against Zod schema — no more garbage AI responses
 * - If we ever need to swap to a different AI provider, change ONE LINE
 * - Built-in retry logic and timeout handling
 *
 * USAGE:
 *   import { groqModel, streamAIText, generateAIObject } from '@/lib/ai/client';
 *
 * ADDING NEW AI FUNCTIONS:
 * 1. Define a Zod schema in schemas.js
 * 2. Write a prompt builder function in the relevant feature file
 * 3. Call generateAIObject(schema, prompt) — returns typed, validated object
 */
import { createGroq } from '@ai-sdk/groq'
import { streamText, generateObject } from 'ai'
import { env } from '@/lib/config/env'
import { captureError, logger } from '@/lib/utils/logger'

// Groq client — uses free API key from environment
const groq = createGroq({ apiKey: env.groqApiKey })

// Best free Groq model (as of 2025) — fast, good quality
export const GROQ_MODEL = 'llama-3.3-70b-versatile'

// Context window: 128k tokens — enough for full lesson plans
export const groqModel = groq(GROQ_MODEL)

/**
 * Stream AI-generated prose to the client.
 * Use for: lesson plan prose, story weaver, report comments (long text)
 *
 * @param {string} systemPrompt - Instructions for the AI
 * @param {string} userPrompt - The specific request
 * @returns {ReadableStream} Stream of text chunks
 */
export async function streamAIText(systemPrompt, userPrompt) {
  const log = logger({ route: 'AI:stream' })
  log.info('Starting AI stream', { promptLength: userPrompt.length })

  const result = await streamText({
    model: groqModel,
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 4000,
    onFinish: ({ usage }) => {
      log.info('AI stream complete', {
        inputTokens: usage?.promptTokens,
        outputTokens: usage?.completionTokens,
      })
    },
  })

  return result
}

/**
 * Generate a structured, validated AI object.
 * Use for: rubrics, lesson plan structures, exam questions, SBA tasks.
 *
 * Unlike streamAIText(), this VALIDATES the output against a Zod schema.
 * If the AI returns garbage, it retries up to 3 times.
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} systemPrompt - Instructions for the AI
 * @param {string} userPrompt - The specific request
 * @returns {Object} Typed, validated object matching schema
 * @throws {Error} If AI fails to produce valid output after 3 retries
 */
export async function generateAIObject(schema, systemPrompt, userPrompt) {
  const log = logger({ route: 'AI:generateObject' })
  log.info('Generating structured AI object')

  try {
    const result = await generateObject({
      model: groqModel,
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 4000,
    })

    log.info('AI object generated successfully', {
      inputTokens: result.usage?.promptTokens,
      outputTokens: result.usage?.completionTokens,
    })

    return result.object
  } catch (error) {
    captureError(error, { route: 'AI:generateObject' })
    throw new Error(`AI generation failed: ${error.message}`)
  }
}
```

### 4.4 Migrate existing AI route handlers

Find all files in `lib/ai/` and `app/api/` that make direct `fetch` calls to Groq (look for `https://api.groq.com` or `groq` in fetch URLs).

For **each file**, replace the raw fetch pattern:

```javascript
// BEFORE (raw fetch — no validation, no typing)
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
  body: JSON.stringify({ model: 'llama-3...', messages: [...] })
});
const data = await response.json();
const text = data.choices[0].message.content; // raw string, could be anything
```

```javascript
// AFTER (Vercel AI SDK — validated, typed, streamable)
import { streamAIText } from '@/lib/ai/client'
const result = await streamAIText(systemPrompt, userPrompt)
return result.toDataStreamResponse() // proper streaming response
```

For **structured outputs** (lesson plans, rubrics, exam questions), use `generateAIObject`:

```javascript
import { generateAIObject } from '@/lib/ai/client'
import { LessonPlanSchema } from '@/lib/ai/schemas'

const lessonPlan = await generateAIObject(
  LessonPlanSchema,
  'You are an expert in Zambia CBC curriculum...',
  userPrompt
)
// lessonPlan is now a typed LessonPlan object — not a string
await prisma.lessonPlan.update({ where: { id }, data: { structuredContent: lessonPlan } })
```

### 4.5 Update Prisma schema for structured lesson plan storage

In `prisma/schema.prisma`, find the `LessonPlan` model and add:

```prisma
model LessonPlan {
  // ... existing fields ...
  structuredContent Json?    // New: typed LessonPlan object from AI
  generatedAt       DateTime? // When AI generated it
  aiModel           String?   // Which model generated it (for debugging)
  // Keep existing content String? field for backwards compatibility
  // Migrate to structuredContent over time
}
```

Run: `npx prisma migrate dev --name add_lesson_plan_structured_content`

**Documentation to write:** After Task 4, create `docs/AI_GUIDE.md`:

- Which AI functions exist and what they do
- How to add a new AI-powered feature (step by step with code example)
- Cost information (Groq free tier limits)
- How to debug AI generation failures
- Schema definitions reference

---

## TASK 5 — ECZ Data Model (Week 3, ~3 days)

### 5.1 Add Prisma migrations

Add these models to `prisma/schema.prisma`. Check existing models first to avoid duplicates:

```prisma
// ─── ECZ COMPETENCIES ────────────────────────────────────────────────────────
/**
 * The 12 key competencies defined in the 2023 Zambia Education Curriculum Framework.
 * These are system-level seeds (same for every school).
 *
 * IMPORTANT: Do not delete or rename these — they match official ECZ documents.
 */
model ECZCompetency {
  id          String    @id @default(cuid())
  name        String    @unique
  descriptor  String    @db.Text
  category    String    // "Cognitive" | "Social" | "Applied"
  SBATasks    SBATaskCompetency[]
  createdAt   DateTime  @default(now())
}

// ─── SUBJECT CONSTRUCT ───────────────────────────────────────────────────────
/**
 * ECZ-defined construct for each of the 16 CBC subjects.
 * A construct is the "exit competence" for Form 4 — what learners can DO.
 *
 * SOURCE: ECZ Assessment Guidelines 2023, Section 2.3
 */
model SubjectConstruct {
  id                String    @id @default(cuid())
  subjectName       String    @unique // Official ECZ subject name
  construct         String    @db.Text // The ECZ construct statement
  elementsOfConstruct Json   // Array of element objects
  sbaWeight         Int       @default(30) // % — PE is 40, all others 30
  examWeight        Int       @default(70) // % — PE is 60, all others 70
  hasMultipleChoice Boolean   @default(false) // Always false at secondary level
  createdAt         DateTime  @default(now())
}

// ─── SBA TASK ────────────────────────────────────────────────────────────────
/**
 * A School-Based Assessment task following the ECZ 5-part structure.
 *
 * ECZ RULES:
 * - Only for Forms 1, 2, 3 — NEVER Form 4
 * - Must have real-life Zambian context
 * - Rubric must use 4-level ECZ scale
 * - Scores submitted to ECZ by 31 January of following year
 *
 * VALIDATION: The API enforces form ≠ Form 4 at route level.
 */
model SBATask {
  id              String   @id @default(cuid())
  schoolId        String
  subjectId       String
  form            String   // "Form 1" | "Form 2" | "Form 3" — NEVER "Form 4"
  taskType        String   // Project | Practical | Assignment | Presentation | Fieldwork | Portfolio | Observation | End of term test
  title           String
  // ECZ 5-part structure
  context         String   @db.Text  // Real-life Zambian scenario
  instructions    String   @db.Text  // What learner must do
  materials       Json     // Array of materials provided
  rubric          Json     // RubricSchema object
  demonstration   String   @db.Text  // What learner must show
  // Metadata
  term            Int      // 1 | 2 | 3
  academicYear    String   // "2025"
  termWeight      Int      // Term 1=20, Term 2=30, Term 3=50 (per ECZ)
  generatedByAI   Boolean  @default(false)
  aiModel         String?
  // Relations
  school          School   @relation(fields: [schoolId], references: [id])
  scores          SBAScore[]
  competencies    SBATaskCompetency[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([schoolId, form, term])
  @@index([schoolId, subjectId])
}

model SBATaskCompetency {
  taskId        String
  competencyId  String
  task          SBATask      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  competency    ECZCompetency @relation(fields: [competencyId], references: [id])

  @@id([taskId, competencyId])
}

// ─── SBA SCORE ───────────────────────────────────────────────────────────────
/**
 * Individual learner SBA score for a task.
 *
 * ECZ STRUCTURE: Three tasks (max 20 each) + term test (max 40) = 100 total
 * PE EXCEPTION: PE SBA weight is 40% not 30%
 *
 * SUBMISSION: Raw scores (0-100) submitted to ECZ by 31 January each year.
 */
model SBAScore {
  id            String    @id @default(cuid())
  schoolId      String
  taskId        String
  studentId     String
  task1Score    Float?    // max 20
  task2Score    Float?    // max 20
  task3Score    Float?    // max 20
  termTestScore Float?    // max 40
  total         Float?    // computed: sum of above, max 100
  remarks       String?   // e.g. "Medical absence", "Incomplete"
  submittedAt   DateTime?
  // Relations
  task          SBATask  @relation(fields: [taskId], references: [id])
  student       User     @relation(fields: [studentId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([taskId, studentId])
  @@index([schoolId, studentId])
}

// ─── ECZ SUBMISSION ──────────────────────────────────────────────────────────
/**
 * Annual ECZ SBA submission record.
 *
 * DEADLINE: 31 January of the following year (enforced by this model).
 * FORMAT: Scores submitted out of 100 per learner per subject per form.
 * MODERATION: ECZ may request evidence for 2 years — evidence stored in SBATask.
 */
model ECZSubmission {
  id            String    @id @default(cuid())
  schoolId      String
  subjectId     String
  form          String    // "Form 1" | "Form 2" | "Form 3"
  academicYear  Int       // e.g. 2025
  deadline      DateTime  // Always Jan 31 of (academicYear + 1)
  scores        Json      // Array of { studentId, learnerNumber, score, remarks }
  status        String    @default("draft") // "draft" | "submitted" | "accepted" | "moderated"
  submittedAt   DateTime?
  submittedBy   String?   // userId of teacher who submitted
  // Relations
  school        School    @relation(fields: [schoolId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([schoolId, subjectId, form, academicYear])
  @@index([schoolId, academicYear])
}
```

Run: `npx prisma migrate dev --name add_ecz_models`

### 5.2 Create seed file for ECZ reference data

Create `prisma/seeds/ecz-seed.js`:

```javascript
/**
 * ECZ Reference Data Seed
 *
 * Seeds the 12 ECZ competencies and 16 CBC subject constructs.
 * This data comes directly from the ECZ Assessment Guidelines (2023 ZECF).
 *
 * RUN: npm run seed:ecz
 * SAFE TO RE-RUN: Uses upsert — will update if already exists.
 *
 * SOURCE: ECZ Assessment Guidelines PDF, Sections 1.1.1 and 2.3
 */

const ECZ_COMPETENCIES = [
  {
    name: 'Analytical Thinking',
    descriptor: 'Break down problems, evaluate situations and solutions',
    category: 'Cognitive',
  },
  {
    name: 'Citizenship',
    descriptor:
      'Engage in civic activities, promote social justice, show respect for human dignity',
    category: 'Social',
  },
  {
    name: 'Collaboration',
    descriptor: 'Work effectively in groups, respect diverse perspectives',
    category: 'Social',
  },
  {
    name: 'Communication',
    descriptor: 'Use appropriate language, express thoughts clearly',
    category: 'Social',
  },
  {
    name: 'Creativity and Innovation',
    descriptor: 'Generate new ideas, undertake projects',
    category: 'Cognitive',
  },
  {
    name: 'Critical Thinking',
    descriptor: 'Analyse texts, solve complex problems',
    category: 'Cognitive',
  },
  {
    name: 'Emotional Intelligence',
    descriptor: 'Manage emotions, empathise with others',
    category: 'Social',
  },
  {
    name: 'Environmental Sustainability',
    descriptor: 'Show personal role in environmental management',
    category: 'Applied',
  },
  {
    name: 'Problem Solving',
    descriptor: 'Analyse situations, identify resources, develop plans',
    category: 'Cognitive',
  },
  {
    name: 'Digital Literacy',
    descriptor: 'Use digital devices and software appropriately',
    category: 'Applied',
  },
  {
    name: 'Entrepreneurship',
    descriptor: 'Identify business opportunities, create business models',
    category: 'Applied',
  },
  {
    name: 'Financial Literacy',
    descriptor: 'Manage personal and business finances',
    category: 'Applied',
  },
]

const CBC_SUBJECTS = [
  {
    subjectName: 'Mathematics I',
    construct:
      'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
    elementsOfConstruct: [
      'Interprets and performs operations on numbers to make decisions',
      'Uses algebraic thinking to model and solve problems',
      'Applies spatial reasoning to geometric situations',
      'Interprets and analyses data to make informed decisions',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Mathematics II',
    construct:
      'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
    elementsOfConstruct: [
      'Applies index notation and number bases',
      'Solves equations and works with matrices',
      'Applies mensuration and symmetry',
      'Uses probability to make decisions',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'English Language',
    construct:
      'Communicates effectively and confidently in English language both orally and in writing across various contexts and audiences.',
    elementsOfConstruct: [
      'Listens and responds appropriately in various contexts',
      'Reads and comprehends various text types',
      'Writes clearly and coherently for different purposes',
      'Applies grammatical structures accurately',
      'Summarises information concisely',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Biology',
    construct:
      'Demonstrates understanding of living organisms, their structure, functions, and interactions with the environment through scientific inquiry.',
    elementsOfConstruct: [
      'Demonstrates understanding of cell structure and function',
      'Explains the processes of nutrition, transport, and respiration in organisms',
      'Demonstrates understanding of reproduction, growth, and development',
      'Analyses ecological relationships and human impact on the environment',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Chemistry',
    construct:
      'Demonstrates understanding of the composition, structure, properties, and transformations of matter through experimental inquiry.',
    elementsOfConstruct: [
      'Understands the structure of atoms and the periodic table',
      'Explains chemical bonding and the properties of compounds',
      'Performs calculations using the mole concept and stoichiometry',
      'Analyses chemical reactions and energy changes',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Physics',
    construct:
      'Demonstrates understanding of matter, energy, and their interactions through experimental investigation and problem-solving.',
    elementsOfConstruct: [
      'Applies measurement and units to physical quantities',
      'Analyses forces, motion, and energy in real-life contexts',
      'Understands wave phenomena including light and sound',
      'Demonstrates knowledge of electricity, magnetism, and electronics',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Civic Education',
    construct:
      'Demonstrates understanding of civic rights, responsibilities, governance systems, and national values to participate effectively in Zambian society.',
    elementsOfConstruct: [
      'Understands the political development and governance of Zambia',
      'Demonstrates knowledge of citizenship rights, duties, and responsibilities',
      'Analyses the constitution, elections, and the legal system',
      'Promotes national values, peace, and conflict resolution',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'History',
    construct:
      "Demonstrates understanding of Zambia's historical development, African heritage, and global events to promote good citizenship and national identity.",
    elementsOfConstruct: [
      "Analyses Zambia's early history, including the origins of its peoples",
      'Examines the slave trade, colonialism, and the independence struggle',
      'Evaluates post-independence political and economic development',
      'Analyses global events such as the World Wars and the Cold War',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Geography',
    construct:
      'Analyses spatial relationships, human-environmental interaction, and sustainable development using geographical tools and technologies.',
    elementsOfConstruct: [
      "Understands the solar system, Earth's structure, and weather/climate",
      'Applies map reading skills to locate features and navigate',
      'Analyses population, settlement patterns, and urbanisation',
      'Evaluates the use and management of natural resources',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Religious Education',
    construct:
      'Demonstrates understanding of religious beliefs, values, and practices from Christianity, Islam, Hinduism, and Zambian Traditional Religion to promote moral living and social harmony.',
    elementsOfConstruct: [
      'Demonstrates knowledge of the four main religions in Zambia',
      'Analyses moral issues and ethical decision-making',
      'Applies religious teachings to real-life situations',
      'Evaluates the role of religion in promoting peace and unity',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Zambian Languages',
    construct:
      'Communicates effectively in a Zambian language, demonstrating appreciation of Zambian cultural values, oral traditions, and linguistic structures.',
    elementsOfConstruct: [
      'Listens and speaks appropriately in various contexts',
      'Reads and comprehends texts in a Zambian language',
      'Writes clearly and correctly in a Zambian language',
      'Understands and uses oral literature (proverbs, riddles, folktales)',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Literature in English',
    construct:
      'Demonstrates understanding and appreciation of literary works through critical analysis, interpretation, and creative expression.',
    elementsOfConstruct: [
      'Understands the genres and forms of literature',
      'Analyses prose, drama, and poetry using literary devices',
      'Interprets themes, characters, and settings in literary texts',
      'Creates original literary works',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Computer Studies / ICT',
    construct:
      'Demonstrates digital literacy skills to use ICT tools responsibly and effectively for learning, communication, and problem-solving.',
    elementsOfConstruct: [
      'Demonstrates understanding of computer hardware and software',
      'Uses productivity tools (word processors, spreadsheets, presentations)',
      'Navigates the internet and uses online tools safely',
      'Understands cybersecurity and digital citizenship',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Physical Education and Sport',
    construct:
      'Demonstrates physical literacy, understanding of health, fitness, and sports skills to promote lifelong healthy living.',
    elementsOfConstruct: [
      'Demonstrates knowledge of the history and importance of physical education',
      'Performs fitness activities and understands health-related components',
      'Applies skills in various sports and games',
      'Understands anatomy, physiology, and sports biomechanics',
    ],
    sbaWeight: 40, // ← PE EXCEPTION: 40% SBA, not 30%
    examWeight: 60,
  },
  {
    subjectName: 'Art and Design',
    construct:
      'Demonstrates creative expression, visual literacy, and technical skills through various art forms to communicate ideas and appreciate cultural heritage.',
    elementsOfConstruct: [
      'Demonstrates understanding of visual arts elements and principles',
      'Creates original artworks in various media',
      'Appreciates Zambian and African art heritage',
      'Applies entrepreneurial skills in art',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Agricultural Science',
    construct:
      'Demonstrates understanding of agricultural principles, practices, and enterprises to contribute to food security and economic development.',
    elementsOfConstruct: [
      'Understands agriculture in Zambia (importance, activities, factors)',
      'Applies principles of soil science and crop production',
      'Demonstrates knowledge of livestock production',
      'Understands farm management and entrepreneurship',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
]

export { ECZ_COMPETENCIES, CBC_SUBJECTS }
```

Add to `package.json` scripts:

```json
"seed:ecz": "node prisma/seeds/ecz-seed.js"
```

### 5.3 Add API-level ECZ enforcement

Create `lib/middleware/ecz-validation.js`:

```javascript
/**
 * ECZ Assessment Rules Middleware
 *
 * These functions enforce ECZ regulations at the API level.
 * They are called from SBA-related route handlers.
 *
 * RULES ENFORCED:
 * 1. No SBA tasks for Form 4 (year of ECZ examination)
 * 2. SBA scores must be 0-100
 * 3. Submission deadline is Jan 31 of following year
 * 4. PE uses 40% SBA weight, all others use 30%
 *
 * If you add new ECZ rules, add them here — not scattered in route files.
 */

export const VALID_SBA_FORMS = ['Form 1', 'Form 2', 'Form 3']
export const EXAM_ONLY_FORMS = ['Form 4'] // No SBA in exam year

/**
 * Check if SBA is allowed for a given form level.
 * Returns { allowed: boolean, reason: string }
 */
export function canCreateSBATask(form) {
  if (EXAM_ONLY_FORMS.includes(form)) {
    return {
      allowed: false,
      reason: `SBA tasks cannot be created for ${form}. ECZ guidelines state that no SBA is administered in Form 4 (the year of examination).`,
    }
  }
  if (!VALID_SBA_FORMS.includes(form)) {
    return {
      allowed: false,
      reason: `Invalid form level: ${form}. SBA is only for Forms 1, 2, and 3.`,
    }
  }
  return { allowed: true, reason: null }
}

/**
 * Get the ECZ submission deadline for a given academic year.
 * Always 31 January of the following year.
 *
 * Example: For 2025 academic year → deadline is 2026-01-31
 */
export function getSBASubmissionDeadline(academicYear) {
  const year = parseInt(academicYear)
  return new Date(`${year + 1}-01-31T23:59:59.000Z`)
}

/**
 * Get SBA weight percentage for a subject.
 * PE is 40%, all other subjects are 30%.
 */
export function getSBAWeight(subjectName) {
  const PE_SUBJECTS = ['Physical Education and Sport', 'Physical Education', 'PE']
  return PE_SUBJECTS.includes(subjectName) ? 40 : 30
}

/**
 * Calculate term weight for SBA scoring.
 * Term 1 = 20%, Term 2 = 30%, Term 3 = 50%
 */
export function getTermWeight(term) {
  const weights = { 1: 20, 2: 30, 3: 50 }
  return weights[term] || null
}

/**
 * Validate SBA total score (max 100).
 * task1(20) + task2(20) + task3(20) + termTest(40) = 100
 */
export function validateSBAScore({ task1Score, task2Score, task3Score, termTestScore }) {
  const errors = []
  if (task1Score !== null && task1Score !== undefined && (task1Score < 0 || task1Score > 20))
    errors.push('Task 1 score must be 0-20')
  if (task2Score !== null && task2Score !== undefined && (task2Score < 0 || task2Score > 20))
    errors.push('Task 2 score must be 0-20')
  if (task3Score !== null && task3Score !== undefined && (task3Score < 0 || task3Score > 20))
    errors.push('Task 3 score must be 0-20')
  if (
    termTestScore !== null &&
    termTestScore !== undefined &&
    (termTestScore < 0 || termTestScore > 40)
  )
    errors.push('Term test score must be 0-40')

  const total = (task1Score || 0) + (task2Score || 0) + (task3Score || 0) + (termTestScore || 0)
  if (total > 100) errors.push(`Total score ${total} exceeds maximum of 100`)

  return { valid: errors.length === 0, errors, total }
}
```

**Documentation to write:** After Task 5, create `docs/ECZ_COMPLIANCE.md`:

- Summary of ECZ rules this platform enforces
- Where each rule is enforced (which file, which function)
- List of the 12 competencies and 16 subjects with their constructs
- SBA scoring structure and deadlines

---

## TASK 6 — Africa's Talking SDK (Week 4, ~2 days)

### 6.1 Install official SDK

```bash
npm install africastalking
```

### 6.2 Create SMS service

Create `lib/sms/africastalking.js`:

```javascript
/**
 * Africa's Talking SMS Service
 *
 * COST: Free sandbox for development. Production rates: ~$0.001-0.004/SMS (very cheap)
 * FREE SANDBOX: Use username="sandbox" and any API key for testing
 *
 * REPLACES: The custom lib/sms/ implementation.
 *
 * SETUP:
 * 1. Create account at africastalking.com
 * 2. Create a new app → get username and API key
 * 3. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in .env
 *
 * ZAMBIA NUMBERS: Must be in format +260XXXXXXXXX
 *
 * USAGE:
 *   import { smsService } from '@/lib/sms/africastalking';
 *   await smsService.sendSMS(['+260971234567'], 'Your message here');
 */
import { env } from '@/lib/config/env'
import { logger, captureError } from '@/lib/utils/logger'

// Lazy initialization — only create client if SMS is configured
let smsClient = null

function getSMSClient() {
  if (!env.features.sms) {
    return null
  }
  if (!smsClient) {
    const AfricasTalking = require('africastalking')
    const at = AfricasTalking({
      apiKey: env.atApiKey,
      username: env.atUsername,
    })
    smsClient = at.SMS
  }
  return smsClient
}

/**
 * SMS message templates for ZSMS.
 * All templates are in plain English (not Zambian languages) for now.
 * Future: add Bemba, Nyanja translations.
 */
export const SMS_TEMPLATES = {
  /**
   * Welcome message sent when a school portal is created.
   * @param {string} schoolName
   * @param {string} subdomain
   */
  PORTAL_CREATED: (schoolName, subdomain) =>
    `Welcome to ZSMS! Your school portal for ${schoolName} is ready at ${subdomain}.bluepeacktechnologies.com. Login with the credentials sent to your email.`,

  /**
   * SBA submission deadline reminder (sent mid-January).
   * @param {string} teacherName
   * @param {string} subject
   * @param {string} form
   */
  SBA_DEADLINE_REMINDER: (teacherName, subject, form) =>
    `ZSMS Reminder: Dear ${teacherName}, ECZ SBA scores for ${subject} ${form} are due by 31 January. Please submit via your dashboard at zsms.app.`,

  /**
   * Attendance alert to parent/guardian.
   * @param {string} studentName
   * @param {string} date
   * @param {string} schoolName
   */
  ATTENDANCE_ALERT: (studentName, date, schoolName) =>
    `${schoolName}: ${studentName} was marked absent on ${date}. Please contact the school if this is incorrect.`,

  /**
   * Results published notification.
   * @param {string} studentName
   * @param {string} term
   */
  RESULTS_PUBLISHED: (studentName, term) =>
    `ZSMS: ${studentName}'s ${term} results are now available. Login to view them at your school portal.`,

  /**
   * Fee payment confirmation.
   * @param {string} amount
   * @param {string} schoolName
   */
  PAYMENT_CONFIRMED: (amount, schoolName) =>
    `Payment confirmed: K${amount} received for ${schoolName} ZSMS subscription. Thank you.`,
}

/**
 * Send SMS to one or more phone numbers.
 *
 * @param {string[]} phoneNumbers - Array of numbers in +260XXXXXXXXX format
 * @param {string} message - SMS text (max 160 chars per SMS)
 * @param {string} [from] - Sender ID (must be registered with AT)
 * @returns {Promise<{success: boolean, results: any[]}>}
 */
export async function sendSMS(phoneNumbers, message, from = 'ZSMS') {
  const log = logger({ route: 'SMS:send' })

  if (!env.features.sms) {
    log.warn('SMS not configured — AFRICASTALKING_API_KEY missing. Message not sent.', {
      recipients: phoneNumbers.length,
      messageLength: message.length,
    })
    return { success: false, reason: 'SMS not configured', results: [] }
  }

  const client = getSMSClient()

  // Validate and format Zambian numbers
  const formattedNumbers = phoneNumbers
    .map((n) => n.replace(/^0/, '+260').replace(/^260/, '+260'))
    .filter((n) => n.match(/^\+260[79]\d{8}$/))

  if (formattedNumbers.length === 0) {
    log.warn('No valid Zambian numbers to send SMS to', { original: phoneNumbers })
    return { success: false, reason: 'No valid Zambian phone numbers', results: [] }
  }

  try {
    log.info('Sending SMS', { recipients: formattedNumbers.length, messageLength: message.length })

    const result = await client.send({
      to: formattedNumbers,
      message,
      from,
    })

    log.info('SMS sent successfully', {
      sent: result.SMSMessageData?.Recipients?.length,
      cost: result.SMSMessageData?.Message,
    })

    return { success: true, results: result.SMSMessageData?.Recipients || [] }
  } catch (error) {
    captureError(error, { route: 'SMS:send', recipients: formattedNumbers.length })
    return { success: false, reason: error.message, results: [] }
  }
}

export const smsService = { sendSMS, SMS_TEMPLATES }
```

**Documentation to write:** After Task 6, update `docs/SMS_GUIDE.md`:

- How to set up Africa's Talking sandbox for development
- How to send an SMS from code
- All available SMS templates
- How to add a new template
- Zambia phone number format requirements

---

## TASK 7 — QR Code Attendance (Week 3–4, ~3 days)

### 7.1 Install QR package

```bash
npm install qrcode
```

### 7.2 Create QR attendance service

Create `lib/attendance/qr.js`:

```javascript
/**
 * QR Code Attendance System
 *
 * HOW IT WORKS:
 * 1. Teacher clicks "Start QR Attendance" on dashboard
 * 2. Server generates a signed QR code (JWT, 15 min expiry)
 * 3. QR code contains: sessionId, schoolId, classId, teacherId, expiry
 * 4. Teacher projects QR code on screen or shows on phone
 * 5. Students scan with any smartphone camera (no app needed)
 * 6. Scan opens mobile browser → student confirms name → marked present
 * 7. Teacher sees real-time attendance count on dashboard
 *
 * SECURITY:
 * - QR JWT signed with JWT_SECRET — cannot be forged
 * - 15 minute expiry — cannot be reused next day
 * - Student must be enrolled in the class — checked at mark endpoint
 * - One mark per student per session — duplicate scan rejected
 *
 * OFFLINE USE:
 * - Teacher can generate QR while online, then go offline
 * - QR is valid for 15 min regardless of connectivity
 * - Student marks are queued locally if offline, sync when back online
 */
import QRCode from 'qrcode'
import jwt from 'jsonwebtoken'
import { env } from '@/lib/config/env'

const QR_EXPIRY_MINUTES = 15
const QR_SECRET_SUFFIX = '-qr-attendance' // Separate from auth JWT secret

/**
 * Generate a QR code for an attendance session.
 * Returns a base64 PNG data URL ready for display in <img> tag.
 *
 * @param {Object} session
 * @param {string} session.sessionId - UUID of the attendance session
 * @param {string} session.schoolId
 * @param {string} session.classId
 * @param {string} session.subjectId
 * @param {string} session.teacherId
 * @param {string} session.baseUrl - e.g. https://school.bluepeacktechnologies.com
 * @returns {Promise<{qrDataUrl: string, token: string, expiresAt: Date}>}
 */
export async function generateAttendanceQR(session) {
  const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000)

  // Sign the session data as a JWT
  const token = jwt.sign(
    {
      type: 'attendance-qr',
      sessionId: session.sessionId,
      schoolId: session.schoolId,
      classId: session.classId,
      subjectId: session.subjectId,
      teacherId: session.teacherId,
    },
    env.jwtSecret + QR_SECRET_SUFFIX,
    { expiresIn: `${QR_EXPIRY_MINUTES}m` }
  )

  // Build the URL students will be taken to when they scan
  const attendanceUrl = `${session.baseUrl}/attend?t=${token}`

  // Generate QR code as base64 PNG
  const qrDataUrl = await QRCode.toDataURL(attendanceUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#1a5c36', light: '#ffffff' }, // ZSMS green
  })

  return { qrDataUrl, token, expiresAt, attendanceUrl }
}

/**
 * Validate a QR attendance token.
 * Returns the decoded session data or throws if invalid/expired.
 *
 * @param {string} token - JWT from QR code URL
 * @returns {{sessionId, schoolId, classId, subjectId, teacherId}}
 */
export function validateAttendanceToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret + QR_SECRET_SUFFIX)
  if (decoded.type !== 'attendance-qr') {
    throw new Error('Invalid token type')
  }
  return decoded
}
```

### 7.3 Create API routes for QR attendance

Create `app/api/attendance/qr-generate/route.js` (teacher starts session):

```javascript
/**
 * POST /api/attendance/qr-generate
 *
 * Teacher starts a QR attendance session.
 * Returns a QR code image (base64 PNG) and session details.
 *
 * REQUIRES: Teacher role JWT
 * BODY: { classId, subjectId, date }
 * RETURNS: { qrDataUrl, sessionId, expiresAt, attendanceUrl }
 */
```

Create `app/api/attendance/qr-mark/route.js` (student marks attendance):

```javascript
/**
 * POST /api/attendance/qr-mark
 *
 * Student scans QR code → this endpoint marks them present.
 * Called from the /attend mobile page after student confirms their name.
 *
 * VALIDATES:
 * - QR token is valid and not expired
 * - Student is enrolled in the class
 * - Student hasn't already been marked for this session
 *
 * NO AUTH REQUIRED — the QR token is the authentication.
 * BODY: { token, studentName } (student confirms their name on the page)
 * RETURNS: { success: true, studentName, markedAt }
 */
```

Create `app/(school)/attend/page.js` (mobile landing page for students):

```javascript
/**
 * /attend?t={token}
 *
 * Mobile-friendly page students land on after scanning QR code.
 * Works in any mobile browser — no app download required.
 *
 * FLOW:
 * 1. Extract token from URL
 * 2. Validate token (show error if expired)
 * 3. Show student name input (or list if small class)
 * 4. Student confirms → POST /api/attendance/qr-mark
 * 5. Show "✓ Marked present" confirmation
 *
 * DESIGN: Full-screen, large text, works on small screens with 2G
 */
```

**Documentation to write:** After Task 7, create `docs/QR_ATTENDANCE.md`:

- How QR attendance works (with flow diagram)
- How to start a QR session as a teacher
- How students mark attendance
- Security model (JWT signing, expiry, one-mark-per-session)
- Offline capability and limitations

---

## TASK 8 — Documentation System (Throughout, ~ongoing)

### 8.1 Create documentation structure

Create these files if they don't exist:

```
docs/
├── README.md              — Documentation index
├── SETUP.md               — Local development setup (NEW)
├── ENVIRONMENT.md         — All env variables (from Task 1)
├── DEVELOPER_GUIDE.md     — How to contribute / add features (NEW)
├── TESTING.md             — How to write and run tests (from Task 3)
├── AI_GUIDE.md            — AI features documentation (from Task 4)
├── ECZ_COMPLIANCE.md      — ECZ rules and implementation (from Task 5)
├── SMS_GUIDE.md           — SMS setup and templates (from Task 6)
├── QR_ATTENDANCE.md       — QR attendance system (from Task 7)
├── API_ROUTES.md          — Full API route reference (NEW — auto-generated)
└── CHANGELOG.md           — All changes (MAINTAIN THROUGHOUT)
```

### 8.2 Create `docs/DEVELOPER_GUIDE.md`

This is the most important document for future developers. Include:

```markdown
# ZSMS Developer Guide

## Quick start (15 minutes)

1. Clone repo
2. Copy `.env.example` to `.env.local` and fill in values
3. `npm install`
4. `npx prisma db push`
5. `npm run seed:ecz`
6. `npm run dev`

## Architecture overview

[Describe the multi-tenant subdomain system, how schoolId flows through every request, how JWT auth works, how the AI layer works]

## Adding a new API route

[Step-by-step template with: logging, auth check, schoolId extraction, input validation, Prisma query, error handling, response]

## Adding a new AI feature

[Step by step: define Zod schema → write prompt → call generateAIObject → store result]

## Adding a new SMS template

[Step by step with example]

## Database migrations

[How to add a model, run migration, write seed data]

## ECZ compliance rules

[Reference to ECZ_COMPLIANCE.md]

## Common bugs and fixes

[Living document — add an entry every time you fix a bug in production]

## Deployment

[How to deploy to Vercel, what env vars to set, how to run migrations on deploy]
```

### 8.3 CHANGELOG format

Every PR that merges to main must add an entry to `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added

- QR code attendance system — teachers can display QR, students scan to mark present (Task 7)
- ECZ data models — 12 competencies, 16 subject constructs, SBATask, SBAScore, ECZSubmission
- Zod schemas for AI outputs — LessonPlan, Rubric, SBATask, ECZExamQuestion now typed

### Changed

- AI layer migrated from raw Groq fetch to Vercel AI SDK — better streaming, typed outputs
- Africa's Talking SMS — replaced custom implementation with official SDK

### Fixed

- Duplicate .js/.ts routes causing 403 on teaching-assignments
- Form 4 SBA creation now blocked at API level (was only UI-level)

### Security

- Added Zod env validation on startup — prevents missing EMAIL_FROM class of bugs
- Added Sentry error tracking to all API routes

## [2.0.3] - 2026-05-xx

[existing entries...]
```

---

## FINAL CHECKLIST — Run before declaring Phase 1 complete

- [ ] `npm run build` completes with 0 errors
- [ ] `npm test` passes all tests (0 failures)
- [ ] `GET /api/health` returns 200 with `status: "healthy"`
- [ ] Login works end-to-end in browser
- [ ] A lesson plan generates and streams correctly
- [ ] SBA task creation is blocked for Form 4 (test with Postman/curl)
- [ ] QR code generates and scan-to-mark works on mobile browser
- [ ] Sentry receives a test error (throw one deliberately, check Sentry dashboard)
- [ ] All 8 `docs/` files have been created and filled in
- [ ] `CHANGELOG.md` has entries for every task completed
- [ ] `.env.example` is up to date with every variable
- [ ] No `@ai-sdk/anthropic` or other paid AI SDK in `package.json`
- [ ] `npm run seed:ecz` seeds all 12 competencies and 16 subjects without errors

---

## NOTES FOR FUTURE DEVELOPERS

**Why we use Groq instead of OpenAI/Anthropic:**
Groq is free up to 14,400 requests/day. OpenAI and Anthropic charge per token. For a pilot project serving Zambian schools, free is the only viable option. When the project generates revenue, evaluate upgrading.

**Why Vercel AI SDK instead of raw fetch:**
The raw fetch approach produced untyped markdown strings. A lesson plan stored as a blob of markdown cannot be searched, edited field-by-field, or validated for ECZ compliance. The Vercel AI SDK with Zod schemas produces typed objects that match our database models.

**Why Africa's Talking instead of Twilio:**
Africa's Talking serves Zambia natively (MTN, Airtel, Zamtel). Twilio is international and more expensive for Africa. AT has an official Node.js SDK and a free sandbox.

**Why QR attendance before face recognition:**
Face recognition requires a camera, decent lighting, a trained model, and a high-powered device. QR attendance requires any smartphone with a camera and a 2G connection. For rural Zambian schools, QR is the right MVP.

```

```
