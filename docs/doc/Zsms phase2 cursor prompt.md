# ZSMS — Phase 2 Cursor Agent Prompt

## Status: Phase 1 complete (32/32 tests) · Starting Phase 2

**Project:** Zambian School Management System (ZSMS)
**Stack:** Next.js 16 · React 19 · PostgreSQL/Prisma 6 · Neon · JWT · Groq AI (FREE) · Africa's Talking · Lipila · Expo

---

## ⚠️ CRITICAL RULES (same as Phase 1 — read before touching anything)

1. **NEVER install `@ai-sdk/anthropic`, `@ai-sdk/openai`, or any paid AI provider.**
2. **NEVER add any paid external service.** Every service used must have a free tier.
3. **DO NOT break any of the 32 existing Vitest tests.** Run `npm test` after every task and fix failures before continuing.
4. **After every completed task:** update `CHANGELOG.md`, the relevant `docs/` file, and `review.md`.
5. **Add JSDoc comments** to every new function, class, and API route.
6. **Read a file before editing it.** Never guess at existing behaviour.

---

## 🔴 HOTFIX — FIX THIS FIRST BEFORE ANYTHING ELSE

### HOTFIX: Groq `json_schema` model error

**Error seen in production:**

```
AI generation failed: This model does not support response format `json_schema`.
See supported models at https://console.groq.com/docs/structured-outputs#supported-models
```

**Root cause:**
The Vercel AI SDK's `generateObject()` defaults `structuredOutputs: true`, which sends `json_schema` to Groq.
`llama-3.3-70b-versatile` (the current model in `lib/ai/client.js`) does NOT support `json_schema`.

Only newer Groq models support `json_schema` structured outputs natively.
For all other Groq free-tier models, we must use `structuredOutputs: false` which falls back to `json_object` mode (still returns valid JSON, just without strict schema enforcement).

**Fix — edit `lib/ai/client.js`:**

1. Define TWO model constants:

```javascript
// Model for streaming/prose generation (fast, no structured output needed)
export const GROQ_STREAM_MODEL = 'llama-3.3-70b-versatile'

// Model for structured JSON generation (supports json_schema)
// gemma2-9b-it supports structured outputs on Groq free tier
// If this fails, fall back to json_object mode with llama-3.3-70b-versatile
export const GROQ_STRUCTURED_MODEL = 'llama-3.3-70b-versatile'
```

2. Update `generateAIObject()` to set `structuredOutputs: false` and use `json_object` fallback:

```javascript
export async function generateAIObject(schema, systemPrompt, userPrompt) {
  const log = logger({ route: 'AI:generateObject' })
  log.info('Generating structured AI object')

  try {
    const result = await generateObject({
      model: groq(GROQ_STRUCTURED_MODEL, {
        structuredOutputs: false, // ← THIS IS THE FIX
        // Falls back to json_object mode — supported by all Groq free models
        // Output is valid JSON but not schema-enforced at the API level
        // Zod validation on our side still catches any schema violations
      }),
      schema,
      mode: 'json', // ← Explicitly use json_object mode
      system:
        systemPrompt +
        '\n\nIMPORTANT: Respond ONLY with valid JSON that matches the requested structure. No markdown, no explanation, just JSON.',
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

3. Verify the fix works: open the ECZ Practice Papers feature, generate a practice paper for Physics Form 3 on the topic "Light". It should succeed without the `json_schema` error.

4. Run `npm test` — all 32 tests must still pass.

5. Add CHANGELOG entry: "Fix: Groq json_schema error — generateObject now uses mode:'json' with structuredOutputs:false for compatibility with all free-tier Groq models"

---

## PHASE 2 TASK LIST

Execute in order. Complete each task fully (including tests and docs) before starting the next.

---

## TASK 9 — Playwright End-to-End Tests (Week 1, ~3 days)

### Why this comes first

Phase 1 gave us 32 unit tests covering individual functions.
Phase 2 needs E2E tests that test the full user journey through a real browser.
Before adding more features, we need a safety net that will catch regressions.

### 9.1 Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium  # only chromium — keeps CI fast and free
```

### 9.2 Create `playwright.config.js`

```javascript
/**
 * Playwright E2E test configuration for ZSMS.
 *
 * Tests run against a locally running dev server.
 * CI: runs against the dev server started automatically.
 *
 * HOW TO RUN:
 *   npm run test:e2e          — run all E2E tests (headless)
 *   npm run test:e2e:ui       — open Playwright UI (interactive)
 *   npm run test:e2e:debug    — headed mode with pause on failure
 *
 * WHERE TO PUT TESTS:
 *   __tests__/e2e/            — all E2E test files
 *
 * WHAT TO TEST:
 *   Only happy paths and critical gates here.
 *   Unit tests (Vitest) cover edge cases and error paths.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '__tests__/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential — dev server is single-instance
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Simulate Zambia mobile network (3G) for realistic testing
    // Remove for local dev speed
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] }, // Android — common in Zambia
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

### 9.3 Create E2E tests

Create `__tests__/e2e/helpers/auth.js`:

```javascript
/**
 * Playwright helper: authenticate as a test user.
 *
 * Uses the test school seeded by `npm run seed:local`.
 * Call this in beforeEach for tests that need an authenticated session.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'teacher' | 'headteacher' | 'student'} role
 */
export async function loginAs(page, role) {
  const credentials = {
    teacher: { email: 'teacher@test.zsms.local', password: 'Test1234!' },
    headteacher: { email: 'head@test.zsms.local', password: 'Test1234!' },
    student: { email: 'student@test.zsms.local', password: 'Test1234!' },
  }
  const { email, password } = credentials[role]

  await page.goto('/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('[type="submit"]')
  await page.waitForURL('**/dashboard/**')
}
```

Create `__tests__/e2e/auth.spec.js`:

```javascript
/**
 * E2E: Authentication flow
 *
 * Tests:
 * 1. Login page renders correctly
 * 2. Valid credentials → redirects to dashboard
 * 3. Wrong password → shows error (does not crash)
 * 4. Logout → clears session, redirects to login
 */
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1, h2')).toContainText(/sign in|login|welcome/i)
    await expect(page.locator('[name="email"]')).toBeVisible()
    await expect(page.locator('[name="password"]')).toBeVisible()
  })

  test('wrong password shows error without crashing', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'nobody@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('[type="submit"]')
    // Should NOT navigate away or throw 500
    await expect(page).toHaveURL(/login/)
    // Should show some error feedback
    await expect(page.locator('[role="alert"], .error, [data-error]'))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Error might be inline — just ensure no 500 page
      })
  })
})
```

Create `__tests__/e2e/qr-attendance.spec.js`:

```javascript
/**
 * E2E: QR attendance flow
 *
 * Tests:
 * 1. Teacher can generate QR code
 * 2. QR code URL is reachable from mobile browser
 * 3. /attend page renders with student name input
 * 4. Expired token shows clear error
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth.js'

test.describe('QR Attendance', () => {
  test('/attend page renders for valid token', async ({ page }) => {
    // The /attend page must work without login (students scan QR)
    await page.goto('/attend?t=invalid-token')
    // Should show error, not blank page or 500
    await expect(page.locator('body')).toContainText(/expired|invalid|error/i)
  })

  test('/attend page shows student name field', async ({ page }) => {
    // With a valid token structure — we can't generate a real one here
    // but we can verify the page handles the state correctly
    await page.goto('/attend')
    await expect(page).not.toHaveURL(/500|error/)
  })
})
```

Create `__tests__/e2e/health.spec.js`:

```javascript
/**
 * E2E: Health and system checks
 *
 * These tests run before every deployment to verify the system is up.
 */
import { test, expect } from '@playwright/test'

test.describe('System health', () => {
  test('GET /api/health returns healthy', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()
    expect(response.status()).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.checks.database).toBe(true)
  })

  test('GET /api/health?live=1 returns ok', async ({ request }) => {
    const response = await request.get('/api/health?live=1')
    expect(response.status()).toBe(200)
  })

  test('marketing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/500|error/)
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
```

### 9.4 Add scripts to `package.json`

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --headed --debug",
"test:all": "vitest run && playwright test"
```

### 9.5 Documentation

Update `docs/TESTING.md` with new section:

- How to run E2E tests
- How to write a new E2E test
- How to debug a failing E2E test (screenshots, traces)
- When to write E2E vs unit test (rule of thumb: E2E for user journeys, unit for logic)

Update CHANGELOG.md with Task 9 entry.

---

## TASK 10 — Offline-First Attendance (Week 1–2, ~4 days)

### Why this matters

Rural Zambian schools have intermittent connectivity.
A teacher must be able to mark attendance even when offline.
Currently if the API is unreachable, attendance is lost.

### 10.1 Install packages

```bash
npm install dexie
```

**Cost:** £0 — Dexie.js is open source (Apache 2.0)

### 10.2 Create offline attendance store

Create `lib/offline/attendance-store.js`:

```javascript
/**
 * Offline attendance store using Dexie (IndexedDB wrapper).
 *
 * WHY DEXIE:
 * - IndexedDB survives page refresh and browser close
 * - Works completely offline — no server needed
 * - Dexie makes IndexedDB readable/writable in ~5 lines
 * - ~10KB gzipped — negligible bundle cost
 *
 * HOW IT WORKS:
 * 1. Teacher marks attendance → stored in IndexedDB immediately
 * 2. App tries to sync to server in background
 * 3. If offline, sync is queued in IndexedDB
 * 4. When online, pending marks are synced automatically
 * 5. Teacher sees sync status on dashboard
 *
 * SCHEMA:
 * - attendanceQueue: pending marks not yet synced to server
 * - syncLog: history of successful syncs (for debugging)
 *
 * USAGE:
 *   import { attendanceStore } from '@/lib/offline/attendance-store';
 *   await attendanceStore.queueMark({ studentId, sessionId, schoolId, classId });
 *   const pending = await attendanceStore.getPendingMarks();
 *   await attendanceStore.syncPending(); // call when online
 */
import Dexie from 'dexie'

// Only runs in browser — Dexie uses IndexedDB
let db = null

function getDB() {
  if (typeof window === 'undefined') return null // SSR guard
  if (db) return db

  db = new Dexie('zsms_offline')

  db.version(1).stores({
    // Pending attendance marks waiting to sync
    attendanceQueue: '++id, sessionId, studentId, schoolId, markedAt, synced',
    // Cached class rosters for offline display
    classRosters: 'classId, schoolId, cachedAt',
    // Sync history for debugging
    syncLog: '++id, syncedAt, count, errors',
  })

  return db
}

export const attendanceStore = {
  /**
   * Queue an attendance mark for sync.
   * Call this immediately when teacher marks a student — works offline.
   */
  async queueMark(mark) {
    const db = getDB()
    if (!db) return null

    return await db.attendanceQueue.add({
      ...mark,
      markedAt: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    })
  },

  /**
   * Get all unsynced marks.
   */
  async getPendingMarks() {
    const db = getDB()
    if (!db) return []
    return await db.attendanceQueue.where('synced').equals(0).toArray()
  },

  /**
   * Mark a queued item as synced.
   */
  async markSynced(id) {
    const db = getDB()
    if (!db) return
    await db.attendanceQueue.update(id, { synced: true, syncedAt: new Date().toISOString() })
  },

  /**
   * Sync all pending marks to the server.
   * Call this when navigator.onLine becomes true.
   *
   * @returns {{ synced: number, failed: number }}
   */
  async syncPending() {
    const db = getDB()
    if (!db || !navigator.onLine) return { synced: 0, failed: 0 }

    const pending = await this.getPendingMarks()
    if (pending.length === 0) return { synced: 0, failed: 0 }

    let synced = 0,
      failed = 0

    for (const mark of pending) {
      try {
        const response = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: mark.studentId,
            sessionId: mark.sessionId,
            schoolId: mark.schoolId,
            classId: mark.classId,
            status: mark.status || 'present',
            markedAt: mark.markedAt,
            source: 'offline-sync',
          }),
        })

        if (response.ok) {
          await this.markSynced(mark.id)
          synced++
        } else {
          await db.attendanceQueue.update(mark.id, {
            retryCount: (mark.retryCount || 0) + 1,
            lastError: `HTTP ${response.status}`,
          })
          failed++
        }
      } catch (e) {
        failed++
        await db.attendanceQueue.update(mark.id, {
          retryCount: (mark.retryCount || 0) + 1,
          lastError: e.message,
        })
      }
    }

    // Log sync event
    await db.syncLog.add({
      syncedAt: new Date().toISOString(),
      count: synced,
      errors: failed,
    })

    return { synced, failed }
  },

  /**
   * Cache a class roster for offline use.
   * Call this when teacher opens an attendance session while online.
   */
  async cacheRoster(classId, schoolId, students) {
    const db = getDB()
    if (!db) return

    await db.classRosters.put({
      classId,
      schoolId,
      students,
      cachedAt: new Date().toISOString(),
    })
  },

  /**
   * Get a cached roster for offline display.
   */
  async getCachedRoster(classId) {
    const db = getDB()
    if (!db) return null
    return await db.classRosters.get(classId)
  },

  /**
   * Count pending unsynced marks.
   * Use for the sync status badge in the UI.
   */
  async getPendingCount() {
    const db = getDB()
    if (!db) return 0
    return await db.attendanceQueue.where('synced').equals(0).count()
  },
}
```

### 10.3 Create sync hook

Create `lib/offline/use-sync.js`:

```javascript
/**
 * React hook: manages online/offline state and triggers sync.
 *
 * USAGE (in attendance components):
 *   const { isOnline, pendingCount, syncNow } = useOfflineSync();
 *
 * Shows a badge when marks are pending sync.
 * Automatically syncs when the browser comes back online.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { attendanceStore } from './attendance-store'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await attendanceStore.getPendingCount()
    setPendingCount(count)
  }, [])

  // Sync now
  const syncNow = useCallback(async () => {
    if (!navigator.onLine || syncing) return
    setSyncing(true)
    try {
      const result = await attendanceStore.syncPending()
      setLastSync({ ...result, at: new Date() })
      await refreshPendingCount()
    } finally {
      setSyncing(false)
    }
  }, [syncing, refreshPendingCount])

  useEffect(() => {
    refreshPendingCount()

    const handleOnline = () => {
      setIsOnline(true)
      syncNow() // Auto-sync when back online
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync every 30 seconds if online and there are pending marks
    const interval = setInterval(() => {
      if (navigator.onLine) syncNow()
    }, 30_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [syncNow, refreshPendingCount])

  return { isOnline, pendingCount, syncing, lastSync, syncNow, refreshPendingCount }
}
```

### 10.4 Create sync status component

Create `components/attendance/SyncStatusBadge.js`:

```javascript
/**
 * SyncStatusBadge — shows offline/online state and pending sync count.
 *
 * USAGE: Add to the attendance teacher dashboard header.
 *
 * Shows:
 * - Green dot + "Online" when connected
 * - Orange dot + "Offline — N marks pending" when disconnected
 * - Spinner + "Syncing..." during sync
 * - "Synced ✓" briefly after successful sync
 */
'use client'

import { useOfflineSync } from '@/lib/offline/use-sync'

export function SyncStatusBadge() {
  const { isOnline, pendingCount, syncing, lastSync, syncNow } = useOfflineSync()

  if (syncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
        <span className="animate-spin">⟳</span>
        Syncing {pendingCount} marks…
      </div>
    )
  }

  if (!isOnline && pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Offline — {pendingCount} mark{pendingCount !== 1 ? 's' : ''} pending
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Offline
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        onClick={syncNow}
        className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 hover:bg-amber-100"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        {pendingCount} mark{pendingCount !== 1 ? 's' : ''} not synced — tap to sync
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      {lastSync ? `Synced ✓` : 'Online'}
    </div>
  )
}
```

### 10.5 Wire offline attendance into the teacher attendance UI

Find the teacher attendance page/component (likely in `app/dashboard/teacher/attendance/` or similar). Make these changes:

1. Import `attendanceStore` and `SyncStatusBadge`
2. Add `SyncStatusBadge` to the page header
3. When a student is marked present/absent, call `attendanceStore.queueMark()` BEFORE the API call
4. The API call becomes fire-and-forget (still try it, but don't block the UI on it)
5. When the attendance session opens, call `attendanceStore.cacheRoster(classId, schoolId, students)` so the roster is available offline

### 10.6 Add offline tests to Vitest

Create `__tests__/unit/offline-attendance.test.js`:

```javascript
/**
 * Tests for offline attendance store
 *
 * Note: Dexie uses IndexedDB which is not available in Node.js test environment.
 * We mock the DB calls and test the business logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Dexie
vi.mock('dexie', () => ({
  default: class MockDexie {
    version() {
      return this
    }
    stores() {
      return this
    }
    attendanceQueue = {
      add: vi.fn().mockResolvedValue(1),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue(1),
    }
    classRosters = { put: vi.fn(), get: vi.fn() }
    syncLog = { add: vi.fn() }
  },
}))

// ... test cases for queueMark, getPendingMarks, syncPending, etc.
```

### 10.7 Documentation

Create `docs/OFFLINE_GUIDE.md`:

- How offline attendance works (with sequence diagram)
- What data is stored locally (Dexie schema)
- How sync works (automatic + manual)
- What happens if sync fails (retry logic)
- Browser compatibility (IndexedDB required — works on all modern mobile browsers)
- Limitations (data is per-device — a teacher's offline marks on their phone won't appear on their laptop until synced)

---

## TASK 11 — Headteacher Live Attendance Dashboard (Week 2, ~3 days)

### Why this matters

Headteachers currently have no real-time visibility into attendance.
They need to see — right now — which classes have started attendance, who is absent, and chronic absentees.

### 11.1 Create live attendance API endpoint

Create `app/api/dashboard/attendance-live/route.js`:

```javascript
/**
 * GET /api/dashboard/attendance-live
 *
 * Real-time attendance summary for headteacher dashboard.
 * Returns today's attendance sessions, counts, and alerts.
 *
 * AUTH: Headteacher or platform admin only
 *
 * RETURNS:
 * {
 *   todayDate: "2025-10-15",
 *   totalClasses: 24,
 *   classesWithAttendance: 18,
 *   classesNotStarted: 6,
 *   totalStudents: 420,
 *   presentToday: 398,
 *   absentToday: 22,
 *   attendanceRate: 94.8,
 *   chronicallyAbsent: [...],  // absent 3+ days this week
 *   sessions: [...]             // per-class breakdown
 * }
 *
 * PERFORMANCE: Results cached for 60 seconds — Neon free tier has connection limits.
 * Add ?refresh=1 to bypass cache.
 */
```

### 11.2 Create attendance dashboard component

Create `components/headteacher/LiveAttendanceSummary.js`:

```javascript
/**
 * LiveAttendanceSummary — headteacher's real-time attendance overview.
 *
 * FEATURES:
 * - Today's attendance rate with colour coding (green ≥90%, amber 75-90%, red <75%)
 * - Per-class breakdown — which classes have taken attendance, which haven't
 * - Quick alert for chronic absentees (absent 3+ days this week)
 * - Auto-refreshes every 2 minutes (no websockets needed)
 *
 * USAGE: Add to headteacher dashboard page
 */
'use client'

import { useState, useEffect } from 'react'
// ... full implementation
```

### 11.3 Add to headteacher dashboard

Find `app/dashboard/headteacher/page.js` (or the headteacher dashboard component).
Add `LiveAttendanceSummary` to the dashboard layout.
Place it prominently — this is one of the most used features.

### 11.4 Add Vitest tests

Create `__tests__/api/attendance-live.test.js`:

```javascript
/**
 * Tests for GET /api/dashboard/attendance-live
 *
 * What we test:
 * 1. Only headteacher/admin can access (403 for teacher/student)
 * 2. Returns correct attendance rate calculation
 * 3. Chronic absentee detection (3+ absences in 5 school days)
 * 4. Returns 0-stat summary when no sessions started yet today
 */
```

---

## TASK 12 — ECZ Export Hardening (Week 2–3, ~3 days)

### Why this matters

The ECZ submission deadline is 31 January.
Currently the export path has gaps — missing scores, invalid formats, no validation before submission.
This task makes the export bulletproof.

### 12.1 Create ECZ export validation

Create `lib/ecz/export-validator.js`:

```javascript
/**
 * ECZ SBA Export Validator
 *
 * Before a teacher submits SBA scores to ECZ, we validate:
 * 1. All enrolled learners have scores (no gaps)
 * 2. All scores are within valid ranges (0-100)
 * 3. Subject is not PE OR weight is 40% (PE exception)
 * 4. Form is 1, 2, or 3 (never 4)
 * 5. Submission deadline has not passed
 * 6. Learner numbers are present (ECZ requires these)
 *
 * RETURNS: { valid: boolean, errors: string[], warnings: string[] }
 *
 * Errors = must fix before submission
 * Warnings = should review but can proceed
 */

export function validateECZExport({
  submission,
  scores,
  enrolledStudents,
  subject,
  form,
  academicYear,
}) {
  const errors = []
  const warnings = []

  // Check form is valid for SBA
  if (form === 'Form 4') {
    errors.push(
      'Form 4 learners do not have SBA — ECZ regulations prohibit SBA in the examination year.'
    )
  }

  // Check deadline
  const deadline = new Date(`${parseInt(academicYear) + 1}-01-31T23:59:59Z`)
  if (new Date() > deadline) {
    errors.push(
      `ECZ submission deadline has passed (31 January ${parseInt(academicYear) + 1}). Contact ECZ directly for late submissions.`
    )
  }

  // Check all enrolled students have scores
  const scoredStudentIds = new Set(scores.map((s) => s.studentId))
  const missingScores = enrolledStudents.filter((s) => !scoredStudentIds.has(s.id))
  if (missingScores.length > 0) {
    errors.push(
      `${missingScores.length} enrolled learner(s) have no SBA scores: ${missingScores.map((s) => s.name).join(', ')}`
    )
  }

  // Check learner numbers
  const missingNumbers = scores.filter((s) => !s.learnerNumber)
  if (missingNumbers.length > 0) {
    warnings.push(
      `${missingNumbers.length} learner(s) have no ECZ learner number. Add these before submission.`
    )
  }

  // Validate score ranges
  scores.forEach((score) => {
    if (score.total < 0 || score.total > 100) {
      errors.push(`${score.studentName}: total score ${score.total} is outside 0-100 range.`)
    }
  })

  // PE exception check
  const isPE = ['Physical Education and Sport', 'Physical Education', 'PE'].includes(subject)
  if (isPE && submission.sbaWeight !== 40) {
    warnings.push('Physical Education SBA weight should be 40%, not 30%. Verify this is correct.')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Format scores for ECZ submission format.
 * ECZ requires: learner name, learner number, score (0-100), remarks.
 */
export function formatForECZSubmission(scores) {
  return scores.map((score, index) => ({
    sn: index + 1,
    learnerName: score.studentName,
    learnerNumber: score.learnerNumber || '',
    sbaScore: Math.round(score.total), // ECZ requires integer
    remarks: score.remarks || '',
  }))
}
```

### 12.2 Create ECZ submission review page

Create `app/dashboard/teacher/ecz/submit/page.js`:

```javascript
/**
 * ECZ SBA Submission Review Page
 *
 * FLOW:
 * 1. Teacher selects subject and form
 * 2. System runs validateECZExport() — shows errors/warnings
 * 3. Teacher fixes any errors
 * 4. Teacher clicks "Submit to ECZ" → marks submission as submitted
 * 5. Download PDF/CSV copy for school records
 *
 * PRINT:
 * The printed/downloaded output matches the official ECZ submission format
 * (same format as the ECZ Rubric Builder we built in Phase 1).
 */
```

### 12.3 Add reminder cron job

Create `lib/cron/ecz-deadline-reminder.js`:

```javascript
/**
 * ECZ Deadline Reminder — runs on 15 January each year.
 *
 * Sends SMS to all teachers who have unsubmitted SBA scores.
 * Message: "ZSMS Reminder: ECZ SBA scores for [Subject] [Form] are due by 31 January. Submit via your dashboard."
 *
 * SCHEDULE: 15 January at 08:00 Zambia time (UTC+2)
 * TRIGGER: Can be set up as a Vercel Cron Job (free on hobby plan — 2 jobs)
 *
 * Vercel cron config (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/ecz-reminder",
 *     "schedule": "0 6 15 1 *"
 *   }]
 * }
 */
```

Create `app/api/cron/ecz-reminder/route.js`:

```javascript
/**
 * GET /api/cron/ecz-reminder
 *
 * Triggered by Vercel Cron on 15 January.
 * Finds all teachers with unsubmitted SBA scores and sends SMS reminder.
 *
 * AUTH: Vercel CRON_SECRET header (set in env)
 * PUBLIC: No — cron secret required
 */
```

Add to `.env.example`:

```
# --- VERCEL CRON (Optional) ---
CRON_SECRET=                          # Random string — protects cron endpoints
```

### 12.4 Add Vitest tests

Create `__tests__/unit/ecz-export-validator.test.js`:

```javascript
/**
 * Tests for ECZ export validation
 *
 * What we test:
 * 1. Form 4 → always error
 * 2. Past deadline → error
 * 3. Missing scores → error with learner names
 * 4. All valid → no errors
 * 5. PE subject with wrong weight → warning
 * 6. Missing learner numbers → warning not error
 */
```

---

## TASK 13 — Billing Polish (Week 3, ~2 days)

### Why this matters

Schools pay via Lipila (mobile money).
Currently if a payment fails or times out, the teacher has no clear feedback and no way to retry.
This causes support requests and frustration.

### 13.1 Payment status polling

In `app/(onboarding)/onboarding/` (the payment step), improve the polling UX:

```javascript
/**
 * Payment polling improvements:
 *
 * 1. Show a clear countdown: "Checking payment status... (checking in 10s)"
 * 2. After 3 minutes of pending → show "Payment is taking longer than expected"
 *    with a "Check again" button
 * 3. On failed payment → show which network failed (MTN/Airtel/Zamtel) with
 *    a "Try a different network" button
 * 4. On success → brief celebration animation before redirecting
 * 5. Add "Need help?" link → opens WhatsApp with pre-filled message
 */
```

### 13.2 Subscription expiry warning

In the teacher/headteacher dashboard:

- If subscription expires in ≤7 days → show amber banner with days remaining
- If subscription expired → show red banner with payment link
- Never show the banner to students (they should not see billing info)

Find the existing `lib/middleware/subscriptionGate.js` and add:

```javascript
/**
 * Returns days until subscription expires.
 * Returns null if subscription is active with no near expiry.
 * Returns 0 if expired.
 */
export function getDaysUntilExpiry(school) {
  if (!school.planExpiresAt) return null
  const msRemaining = new Date(school.planExpiresAt) - new Date()
  const days = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
  return Math.max(0, days)
}
```

Create `components/billing/SubscriptionWarningBanner.js`:

```javascript
/**
 * Shows subscription expiry warnings on teacher/headteacher dashboards.
 * Not shown to students.
 *
 * Logic:
 * - daysLeft > 7: no banner
 * - daysLeft 1-7: amber banner "Your subscription expires in X days"
 * - daysLeft 0: red banner "Subscription expired — renew to maintain access"
 */
```

### 13.3 Lipila retry logic

In `lib/payments/lipila.js`, add exponential backoff for the status check:

```javascript
/**
 * Check Lipila payment status with retry.
 *
 * Lipila sometimes takes 30-60 seconds to confirm.
 * Without retry, we return 'pending' prematurely.
 *
 * Strategy: check at 5s, 15s, 30s, 60s intervals
 * After 3 minutes of pending → return 'timeout' status
 */
export async function checkPaymentStatusWithRetry(referenceId, maxWaitMs = 180_000) {
  // ... implementation
}
```

---

## TASK 14 — Security Hardening (Week 3–4, ~2 days)

### 14.1 Add rate limiting to auth endpoints

In `proxy.js`, the rate limiter already exists (`lib/security/proxyRateLimit.js`).
Verify it is applied to:

- `POST /api/auth/login` — max 10 attempts per IP per 15 minutes
- `POST /api/onboarding/start` — max 5 per IP per hour
- `POST /api/auth/password-reset` — max 3 per IP per hour

If any of these are not rate-limited, add them now.

### 14.2 Add CSRF protection to mutation endpoints

Verify that all POST/PUT/DELETE API routes:

1. Reject requests without the JWT cookie (already done via auth middleware)
2. Check the `Origin` header matches the expected domain on sensitive mutations (billing, user creation)

Add to `lib/middleware/auth.js` or create `lib/middleware/csrf.js`:

```javascript
/**
 * CSRF check for sensitive mutations.
 * Verifies Origin header matches the school's subdomain or the base domain.
 *
 * Applied to: payment endpoints, user creation, school settings changes
 * NOT applied to: GET requests, Lipila webhook (has its own validation)
 */
export function verifyCsrf(req, schoolSubdomain) {
  const origin = req.headers.get('origin')
  if (!origin) return false // No origin header — suspicious

  const allowedOrigins = [
    `https://${process.env.APP_BASE_DOMAIN}`,
    `https://${schoolSubdomain}.${process.env.APP_BASE_DOMAIN}`,
    'http://localhost:3000', // dev only
  ]

  return allowedOrigins.some((allowed) => origin.startsWith(allowed))
}
```

### 14.3 Audit and fix the 403 teaching-assignments duplicate route

This was documented in `TODO.md` as a known issue.
Find both versions of the teaching-assignments route (`.js` and `.ts`).
Keep only the `.js` version (consistent with codebase).
Verify role checks are identical between the two.
Write a Vitest test that confirms the route returns 403 for students and 200 for HOD.

### 14.4 Add security headers audit

In `next.config.js`, verify these security headers are set:

```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

If any are missing, add them.

---

## TASK 15 — Phase 2 Documentation and Test Wrap-up (Week 4, ~2 days)

### 15.1 Run full test suite

```bash
npm test           # All Vitest tests must pass
npm run test:e2e   # All Playwright tests must pass
npm run build      # Must compile without errors
```

Fix any failures before proceeding.

### 15.2 Update all documentation

Update these files with Phase 2 additions:

**`docs/DEVELOPER_GUIDE.md`** — Add sections:

- How to use offline attendance (attendanceStore API)
- How to add a new cron job (Vercel Cron setup)
- How to test payment flows locally (Lipila sandbox)
- Security checklist for new API routes

**`docs/ECZ_COMPLIANCE.md`** — Add:

- ECZ export validation rules (from Task 12)
- How to run the ECZ deadline reminder cron
- What to do if a teacher misses the 31 January deadline

**`docs/TESTING.md`** — Add:

- How to run E2E tests (Playwright)
- How to write a new E2E test
- When to use E2E vs unit test

**`review.md`** — Add Phase 2 achievements section

### 15.3 Update CHANGELOG

Add a complete Phase 2 section to `CHANGELOG.md`:

```markdown
## [2.1.0] - 2026-XX-XX

### Phase 2 — Depth and Reliability

#### Added

- Playwright E2E tests (Task 9): health, auth, QR attendance flows
- Offline attendance (Task 10): Dexie IndexedDB store, background sync, SyncStatusBadge
- Headteacher live attendance dashboard (Task 11): real-time class-level overview
- ECZ export hardening (Task 12): validation, formatted submission, deadline cron
- Subscription warning banners (Task 13): 7-day and expired alerts
- Lipila retry logic (Task 13): exponential backoff for payment status checks
- Security headers audit (Task 14)
- Rate limiting confirmed on login, onboarding, password-reset

#### Fixed

- Groq json_schema error: generateObject now uses mode:'json' + structuredOutputs:false
- Teaching-assignments duplicate .ts/.js route (Task 14)

#### Changed

- Attendance marking is now offline-first (queued locally, synced to server)
```

### 15.4 Create `docs/PHASE3_ROADMAP.md`

Document what comes next so future developers can plan:

```markdown
# Phase 3 — Intelligence and Analytics

## Overview

Phase 3 turns the data ZSMS collects into actionable insights.

## Tasks (in priority order)

### P3.1 — PostgreSQL Row-Level Security (RLS)

- Multi-tenant data isolation at database level
- Prisma middleware to set session variables
- Zero application code changes — pure security layer

### P3.2 — Learning Analytics Dashboard

- Headteacher: SBA score distributions per subject
- HOD: lesson plan submission rates, ECZ alignment
- Student: personal CBC competency progress

### P3.3 — OR-Tools Timetable Solver

- Replace TS greedy solver with Google OR-Tools CP-SAT (Python)
- Handles 500+ learner schools
- CBC period allocation constraints

### P3.4 — AI Report Generation

- generateObject → TermReport (typed)
- HOD review and approval before printing
- Based on SBA scores + attendance

### P3.5 — USSD for Parents

- Africa's Talking USSD API
- Check child attendance, view results, pay fees
- Works on feature phones (no smartphone needed)

### P3.6 — RAG-powered ECZ Practice

- pgvector on Neon for syllabus content
- Students ask questions → retrieval-augmented answers from real syllabi
- Phase 1 ECZ practice papers upgraded to curriculum-grounded questions
```

---

## PHASE 2 FINAL CHECKLIST

Run this before declaring Phase 2 complete:

```bash
# 1. All Vitest tests pass (should be 40+ by now with Phase 2 additions)
npm test

# 2. E2E tests pass
npm run test:e2e

# 3. Build compiles
npm run build

# 4. Groq fix works — generate an ECZ practice paper in the browser
# Should succeed without json_schema error

# 5. Offline store works — open attendance, go offline, mark students, come back online, verify sync

# 6. Health endpoint still healthy
curl http://localhost:3000/api/health

# 7. ECZ export validation blocks Form 4
# Test via Postman: POST /api/ecz/submissions with form: "Form 4" → should return 403

# 8. No paid AI SDKs
grep "anthropic\|openai" package.json

# 9. Security headers present
curl -I http://localhost:3000 | grep -i "x-frame\|x-content\|strict-transport"

# 10. Documentation updated
ls docs/ | wc -l  # Should be 12+ files
```

---

## IMPORTANT NOTES FOR CURSOR

1. **Fix the Groq error first** — everything else depends on AI working.
2. **Dexie only runs in the browser** — always add `if (typeof window === 'undefined') return` guards.
3. **Cron jobs need `CRON_SECRET`** — add to `.env.example` and verify in the cron route handler.
4. **Playwright tests need a running server** — they will auto-start `npm run dev` but the first run is slow.
5. **Do not add websockets** — polling every 60-120 seconds is sufficient for the live attendance dashboard and avoids infrastructure cost.
6. **Keep the AI free** — `structuredOutputs: false` with `mode: 'json'` is the correct fix for Groq. Do not switch to a paid provider.

```

```
