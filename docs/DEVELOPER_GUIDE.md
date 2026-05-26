# ZSMS Developer Guide

Practical notes for working on the Zambian School Management System codebase.

---

## How to add logging to a new API route

Use the structured logger so production logs are JSON (searchable in Vercel) and errors reach Sentry with `schoolId` / `userId` context.

### Copy-paste template

```javascript
import { NextResponse } from 'next/server'
import { logger, captureError } from '@/lib/utils/logger'
// ... your other imports

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const route = '/api/your-route'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  let schoolId
  let userId

  try {
    // 1. Auth & tenant (adjust to your route)
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    schoolId = tenant.schoolId
    userId = auth.user?.id

    const scopedLog = logger({ route, schoolId, userId })
    // ... business logic ...

    scopedLog.response(200, Date.now() - start)
    return NextResponse.json({ success: true })
  } catch (error) {
    captureError(error, { route, schoolId, userId })
    log.response(500, Date.now() - start)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Rules

1. **Never log passwords, tokens, or cookies** — `captureError` strips common sensitive keys.
2. Call `log.request(request)` once at the start.
3. Call `log.response(status, Date.now() - start)` before each return (or on success + catch).
4. Use `captureError(error, { route, schoolId, userId })` in `catch` blocks instead of `console.error` alone.
5. For routes wrapped in `withErrorHandler`, you can still add scoped logging; the handler also calls `captureError` on thrown errors.

### Legacy logger (existing code)

```javascript
import { logger } from '@/lib/utils/logger'

logger.info('Something happened', { count: 3 })
logger.error('Operation failed', err, { schoolId })
```

---

## Sentry (error monitoring)

**Project:** `zinks-0m` / `javascript-nextjs` (EU region)

Configured in:

- `instrumentation-client.js` — browser (Session Replay in production)
- `sentry.server.config.ts` — Node API routes
- `sentry.edge.config.ts` — edge runtime
- `instrumentation.js` — Next.js server bootstrap
- `lib/sentry/options.js` — shared DSN / sampling options
- `app/global-error.tsx` — root error boundary

**Enable in production** (`.env.local` / Vercel):

```env
SENTRY_DSN=https://...@....ingest.de.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.de.sentry.io/...
SENTRY_ORG=zinks-0m
SENTRY_PROJECT=javascript-nextjs
# SENTRY_AUTH_TOKEN=...   # source maps (or use Vercel Sentry integration)
```

Sentry runs only when `NODE_ENV=production` and a DSN is set. Test locally: `/sentry-example-page`.

### Sentry MCP in Cursor

The repo includes [`.cursor/mcp.json`](../.cursor/mcp.json):

```json
{
  "mcpServers": {
    "Sentry": {
      "url": "https://mcp.sentry.dev/mcp/zinks-0m/javascript-nextjs"
    }
  }
}
```

1. Open **Cursor Settings → MCP** and ensure the **Sentry** server is enabled.
2. Complete OAuth when prompted (links Cursor to your Sentry org).
3. In chat, you can ask things like: “What are the latest unresolved issues?” or “Show errors from production in the last 24 hours.”

The MCP does not replace in-app `captureError()` — it helps you investigate issues from the IDE.

---

## Environment validation

See [ENVIRONMENT.md](./ENVIRONMENT.md). Startup checks run from `app/layout.js` via `lib/config/env.js`.

---

## AI features (Groq + Vercel AI SDK)

All AI calls go through `@/lib/ai/client.js`. Structured outputs use Zod schemas in `@/lib/ai/schemas.js`.

- **Streaming prose:** `createGroqTextEventStream` from `@/lib/ai/groq-client`
- **Structured JSON:** `generateAIObject(schema, systemPrompt, userPrompt)`

Full guide: [AI_GUIDE.md](./AI_GUIDE.md).

---

## Related docs

| Doc                                        | Topic                                |
| ------------------------------------------ | ------------------------------------ |
| [ENVIRONMENT.md](./ENVIRONMENT.md)         | Env variables                        |
| [AI_GUIDE.md](./AI_GUIDE.md)               | AI features, schemas, debugging      |
| [SMS_GUIDE.md](./SMS_GUIDE.md)             | Africa's Talking setup and templates |
| [QR_ATTENDANCE.md](./QR_ATTENDANCE.md)     | QR session flow, APIs, security      |
| [TESTING.md](./TESTING.md)                 | Vitest / mocks                       |
| [doc/SETUP_GUIDE.md](./doc/SETUP_GUIDE.md) | Local setup                          |
| [../README.md](../README.md)               | API & architecture                   |
| [../CHANGELOG.md](../CHANGELOG.md)         | Release notes                        |
