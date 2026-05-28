# ZSMS Testing Guide

This project uses **Vitest** for API and unit tests, **Playwright** for E2E browser tests, and **Jest** for legacy React component tests.

## Quick start

```bash
npm test              # Run all Vitest suites once (CI)
npm run test:watch    # Watch mode while developing
npm run test:ui       # Vitest browser UI
npm run test:coverage # Coverage report (lib/ + app/api/)
npm run test:jest     # Legacy Jest tests (__tests__/auth.test.js, etc.)
```

Vitest does **not** connect to a real database. Prisma and external services are mocked in `__tests__/setup.js`.

## Where to put tests

| Location                   | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `__tests__/api/`           | API route handlers — auth, onboarding, SBA, ECZ                 |
| `__tests__/unit/`          | Pure functions (no HTTP)                                        |
| `__tests__/helpers/`       | Shared mocks (`mock-prisma.js`, `request.js`, `next-server.js`) |
| Root `__tests__/*.test.js` | Jest component/integration tests (run with `npm run test:jest`) |

## Critical path suites (must pass before deploy)

1. **`__tests__/api/auth.test.js`** — `POST /api/auth/login` (credentials, validation, subscription gate)
2. **`__tests__/api/onboarding.test.js`** — Payment gate + Lipila callback
3. **`__tests__/api/sba.test.js`** — Form 4 blocked, score caps, deadline helpers
4. **`__tests__/api/ecz.test.js`** — PE 40% vs 30% weight, submission deadline, CSV export gate
5. **`__tests__/unit/offline-attendance.test.js`** — Dexie queue + sync grouping
6. **`__tests__/api/attendance-live.test.js`** — Headteacher-only live summary API
7. **`__tests__/unit/ecz-export-validator.test.js`** — Pre-export validation rules
8. **`__tests__/api/teaching-assignments.test.js`** — Student vs HOD access

## Writing a new API route test

1. Create `__tests__/api/your-feature.test.js`.
2. Import the route handler: `import { POST } from '@/app/api/.../route.js'`.
3. Build requests with `buildRequest()` from `__tests__/helpers/request.js`.
4. Mock dependencies with `vi.mock()` **before** importing the route (or use mocks in `setup.js` for shared services).

Example:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/example/route.js'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(() => true),
}))

describe('POST /api/example', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.exampleModel.create.mockResolvedValue({ id: '1' })
  })

  it('returns 201 on success', async () => {
    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/example',
        body: { name: 'Test' },
        cookies: { access_token: 'fake-jwt' },
      })
    )
    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})
```

## Mocking Prisma

Global mock: `__tests__/helpers/mock-prisma.js`, wired in `__tests__/setup.js` as `@/lib/prisma`.

In each test file:

```javascript
import { mockPrisma } from '../setup.js'

beforeEach(() => {
  mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', schoolId: 's1' })
})
```

Add new models to `createMockPrisma()` when you test routes that use them.

## Mocking external services

Already mocked in `__tests__/setup.js`:

- `@/lib/middleware/rateLimiter`
- `@/lib/auditLog`
- `@/config/email`
- `@/lib/sms`

Mock per-file as needed:

- `@/lib/middleware/auth` — `authMiddleware`, `roleCheck`
- `@/lib/tenant/resolveSchoolId` — `resolveAuthenticatedSchoolId`
- `bcryptjs` — password compare in auth tests
- Lipila / Groq / Resend — mock the module under `lib/` that the route imports

## `next/server` in tests

App routes import `NextResponse` from `next/server`. Vitest aliases that to `__tests__/helpers/next-server.js` (see `vitest.config.js`) so tests run without the full Next.js App Router runtime.

## Environment in tests

`__tests__/setup.js` sets safe test values for `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `GROQ_API_KEY`, etc. Do not point tests at production databases or live API keys.

## Coverage targets

| Area                                            | Target                       | Notes                                      |
| ----------------------------------------------- | ---------------------------- | ------------------------------------------ |
| Critical API paths (auth, onboarding, SBA, ECZ) | **100%** of listed scenarios | Required before production deploy          |
| `lib/ecz/*` compliance helpers                  | **High**                     | Pure functions are cheap to test           |
| All `app/api/**`                                | **40%+** (stretch 60%)       | Add tests when touching a route            |
| UI components                                   | Optional                     | Use Jest + Testing Library via `test:jest` |

Run coverage: `npm run test:coverage` — HTML report under `coverage/`.

## CI recommendation

```yaml
- run: npm test
```

Fail the pipeline if any critical path test fails. Keep `test:jest` separate until legacy suites are migrated to Vitest.

---

## End-to-end tests (Playwright) — Phase 2 Task 9

### Quick start

```bash
# One-time: install browser
npx playwright install chromium

# Seed local users (for login E2E later)
npm run seed:local

# Run E2E (starts dev server automatically unless one is already running)
npm run test:e2e
npm run test:e2e:ui       # interactive debugger
npm run test:e2e:debug    # headed + pause on failure
npm run test:all          # Vitest + Playwright
```

Requires `.env.local` with `DATABASE_URL`, `JWT_SECRET`, and other required vars (see [ENVIRONMENT.md](./ENVIRONMENT.md)).

### Where to put E2E tests

| Location                 | Purpose                       |
| ------------------------ | ----------------------------- |
| `__tests__/e2e/`         | Browser journey tests         |
| `__tests__/e2e/helpers/` | Shared helpers (`auth.js`)    |
| `playwright.config.js`   | Base URL, projects, webServer |

### Current E2E suites

1. **`health.spec.js`** — `/api/health`, home page loads
2. **`auth.spec.js`** — login page, wrong password (no 500)
3. **`qr-attendance.spec.js`** — public `/attend` page

### When to write E2E vs unit test

| Use **Vitest** (unit/API)               | Use **Playwright** (E2E)       |
| --------------------------------------- | ------------------------------ |
| Validation logic, ECZ rules, score caps | Full page load in real browser |
| Auth middleware, Prisma mocks           | Login → dashboard redirect     |
| Error status codes                      | QR scan landing page UX        |
| Fast CI (no browser)                    | Pre-deploy smoke (with DB)     |

**Rule of thumb:** logic in Vitest; user journeys in Playwright.

### Debugging a failing E2E test

1. Run `npm run test:e2e:debug` to replay step-by-step.
2. Open `playwright-report/` after a failed run (HTML reporter).
3. Check `test-results/` for screenshots (captured on failure).
4. Set `PLAYWRIGHT_BASE_URL` if testing against a deployed preview.

### CI note

E2E needs a database and env vars. Run `npm test` (Vitest only) on every PR; run `npm run test:e2e` on staging or nightly unless CI provides Neon + secrets.

### `Timed out waiting for config.webServer`

Next.js first compile on Windows (especially on slow or network drives) can exceed 2 minutes.

**Fastest approach (recommended):**

```powershell
# Terminal 1 — wait until you see "Ready"
npm run dev

# Terminal 2
npm run test:e2e:attach
```

**Or** increase the wait (5 minutes default now):

```powershell
$env:PLAYWRIGHT_WEB_SERVER_TIMEOUT="600000"
npm run test:e2e
```

**Tips:**

- Use `127.0.0.1` (default in `dev:e2e`) instead of `localhost`.
- Move the project off a network drive if you see Next.js "Slow filesystem" warnings.
- Readiness checks `/api/health?live=1` (no database) so the server can report ready sooner.
- Optional mobile project: `$env:PLAYWRIGHT_MOBILE="1"; npm run test:e2e`
