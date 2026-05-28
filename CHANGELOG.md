# Change Log

All notable changes to the Zambian School Management System during the audit and optimization phases.

## [Unreleased]

### Added (Province, district & reporting streams)

- **Required province + district** on onboarding and school registration with district dropdowns per province.
- **`reportingStreamKey`** on `School` and `SchoolRegistration` — segments schools for monitoring and future province/district admins.
- **Platform:** `/platform/streams`, `/platform/districts`, APIs `stats/streams` and `stats/districts`.

### Added (Platform super-admin & Code Playground)

- **Platform console:** `/platform/overview`, `/platform/provinces`, `/platform/billing`, `/platform/health` with `PlatformShell`; aggregation APIs (no enrollment counts).
- **School province/district** on `School` model for geographic reporting.
- **Code Playground:** C++, C#, HTML (live preview), CSS (demo page preview); CSP `connect-src` for Piston (`emkc.org`).
- **`docs/PLATFORM_ADMIN.md`** — scope and privacy boundaries for platform operators.

### Added (Phase 3 — Intelligence & analytics)

- **P3.1 RLS:** `lib/db/school-context.js`, migration `20260528120000_enable_rls`, `docs/RLS.md`.
- **P3.2 Learning analytics:** `lib/analytics/learning-analytics.js`, `GET /api/dashboard/analytics/learning`, `LearningAnalyticsPanel` on headteacher, HOD, and student dashboards.
- **P3.3 OR-Tools:** `services/timetable-solver/` (CP-SAT + HTTP server), `POST /api/timetable/solver/ortools`, `docs/ORTOOLS_SOLVER.md`.
- **P3.4 Term reports:** Prisma `TermReport`, `lib/ai/term-report-service.js`, `/api/ai/term-reports`, HOD/teacher review UI.
- **P3.5 USSD:** `lib/ussd/parent-portal.js`, `POST /api/ussd`, `docs/USSD_GUIDE.md`.
- **P3.6 Study assistant:** `POST /api/ai/study-assistant`, student page + Creative Teaching tab embed.

### Added (Phase 2 Tasks 11–15)

- **Task 11:** `GET /api/dashboard/attendance-live`, `lib/attendance/live-summary.js`, `LiveAttendanceSummary` on headteacher dashboard (2 min refresh).
- **Task 12:** `lib/ecz/export-validator.js`, `/dashboard/teacher/ecz/submit`, `/api/cron/ecz-reminder`, Vercel cron 15 Jan.
- **Task 13:** `SubscriptionWarningBanner`, `getDaysUntilExpiry`, Lipila `checkPaymentStatusWithRetry`, onboarding payment polling UX.
- **Task 14:** Proxy rate limits (login 10/15m, forgot-password 3/h, onboarding/start 5/h); teaching-assignments role tests.
- **Task 15:** `docs/PHASE3_ROADMAP.md`, doc updates, expanded Vitest coverage.

### Added (Phase 2 Task 10 — Offline-first attendance)

- **`lib/offline/attendance-store.js`** — Dexie IndexedDB queue for class attendance; roster cache; sync to `POST /api/attendance`.
- **`lib/offline/use-sync.js`** — React hook for online/offline state, auto-sync on reconnect, 30s polling.
- **`components/attendance/SyncStatusBadge.js`** — Header badge on teacher attendance page.
- **`app/dashboard/attendance/page.js`** — Queue marks on each tap; offline roster fallback; fire-and-forget save + sync.
- **`docs/OFFLINE_GUIDE.md`** — Architecture, schema, sync, limitations.
- **`__tests__/unit/offline-attendance.test.js`** — Grouping, queue dedupe, sync mock tests.

### Security

- Session auth cookies now use `SameSite=Strict` by default.
- Added centralized CSRF defense (`lib/security/csrf.js`) with `/api/csrf-token` and proxy-level validation for state-changing API requests.
- Added uniform server-side role enforcement for all `/api/admin/*` routes in `proxy.js` (blocks non-admin users before route handler execution).
- Tightened login rate limiter to `5` attempts per `15` minutes in production.

### Fixed (Phase 2 HOTFIX — Groq structured output)

- **`generateAIObject`** now uses `mode: 'json'` with `providerOptions.groq.structuredOutputs: false` so free-tier models (e.g. `llama-3.3-70b-versatile`) do not receive unsupported `json_schema` requests.
- Exported **`GROQ_STREAM_MODEL`** and **`GROQ_STRUCTURED_MODEL`** in `lib/ai/client.js`.

### Changed (Phase 2 Task 9 — Playwright E2E reliability)

- Playwright `webServer` waits on `/api/health?live=1` with **5 min** timeout (was 2 min on `/`).
- Added `npm run test:e2e:attach` when dev server is already running; `npm run dev:e2e` binds `127.0.0.1:3000`.
- Mobile E2E project optional via `PLAYWRIGHT_MOBILE=1`.

### Added (Phase 2 Task 9 — Playwright E2E)

- **`@playwright/test`** + `playwright.config.js` — desktop + mobile Chromium projects, auto dev server.
- **E2E suites:** `__tests__/e2e/health.spec.js`, `auth.spec.js`, `qr-attendance.spec.js`, `helpers/auth.js`.
- **Scripts:** `test:e2e`, `test:e2e:ui`, `test:e2e:debug`, `test:all`.
- **`docs/TESTING.md`** — E2E section (when to use E2E vs Vitest, debugging).

### Added (PRD Task 8 — Documentation system)

- **`docs/README.md`** — documentation index for all guides.
- **`docs/SETUP.md`** — 15-minute local setup (Next.js 16, Prisma, seeds).
- **`docs/API_ROUTES.md`** — auto-generated API reference (`npm run docs:api-routes`).
- **`docs/PHASE1_CHECKLIST.md`** — gate before Phase 2.
- **`docs/PHASE2_ROADMAP.md`** — Phase 2 priorities and task order.
- **`scripts/generate-api-routes-doc.js`** — scans `app/api/**/route.*` for methods and paths.

### Changed (PRD Task 8)

- **`docs/DEVELOPER_GUIDE.md`** — expanded: architecture, API/AI/SMS templates, migrations, common bugs, deployment.
- **`package.json`** — `docs:api-routes` script.

### Added (post–Task 7 fixes)

- **Billing upgrade flow** — clickable plan cards with prices, `SubscriptionUpgradePanel`, `POST /api/billing/subscription-payment`, `SchoolPlanPayment` model.
- **AI model fallback** — `GROQ_FALLBACK_MODELS` in `lib/ai/client.js`.
- **CSP `worker-src`** — blob workers allowed for ECZ/guidelines UI.

### Fixed

- **Next.js version** — `package.json` pinned to `next@16.2.4` (was incorrectly resolving to 9.x).
- **Lesson plan Word export** — clearer errors; binary response handling.
- **ECZ/SBA 500** — schema-missing hints; improved seed fetch errors.
- **ESLint pre-commit** — `@babel/parser` dev dependency for husky/lint-staged.

### Security

- Plan payments activate school `plan` + `planExpiresAt` only via Lipila callback (`lib/billing/activate-plan-payment.js`).

---

## [2.2.0] - 2026-05-25

### Added (PRD Task 7 — QR attendance)

- **`qrcode`** dependency and **`lib/attendance/qr.js`** — JWT-signed QR codes (15 min), PNG data URLs, token validation.
- **`POST /api/attendance/qr-generate`** — teacher starts session, returns `qrDataUrl`, `sessionId`, `attendanceUrl`.
- **`GET /api/attendance/qr-info`** — public roster/session context for mobile page.
- **`POST /api/attendance/qr-mark`** — student marks present via QR token (enrollment + duplicate checks).
- **`app/attend/page.js`** — mobile `/attend?t={token}` flow (roster tap or name entry).
- **`docs/QR_ATTENDANCE.md`** — flow, security, offline notes.
- **`__tests__/api/attendance-qr.test.js`** — token and roster matching tests.

### Added (PRD Task 6 — Africa's Talking SDK)

- **Official Africa's Talking SDK** dependency: `africastalking`.
- **`lib/sms/africastalking.js`** — centralized SMS service with lazy SDK client, Zambia number normalization, and reusable templates.
- **`docs/SMS_GUIDE.md`** — sandbox setup, send examples, templates list, and Zambia phone format rules.

### Changed (PRD Task 6)

- **`lib/sms.js`** now routes outbound SMS through the SDK service while preserving existing `sendAfricasTalkingSms` API shape.
- **`docs/DEVELOPER_GUIDE.md`** and **`review.md`** updated with SMS guide references.

### Added (PRD Task 5 — ECZ data model)

- **`EczCompetency`**, **`EczSubjectConstruct`**, **`EczAssessmentCompetency`** — system reference data for 12 competencies and 16 CBC subjects.
- **`npm run seed:ecz`** — `prisma/seeds/ecz-seed.js` upserts official ECZ/ZECF reference data.
- **`lib/middleware/ecz-validation.js`** — `canCreateSBATask`, `validateSBAScore`, `getTermWeight`, re-exports from `ecz-compliance`.
- **`GET /api/ecz/reference`** — competencies and subject constructs for UI.
- **`docs/ECZ_COMPLIANCE.md`** — rules, model mapping, scoring, deadlines.

### Changed (PRD Task 5)

- **`EczAssessment`** — `term`, `academicYear`, `termWeight`, `generatedByAI`, `aiModel`, `instructions`, `demonstration`.
- **`EczSubmission`** — `deadline` (31 Jan of following year).
- SBA/ECZ routes use **`ecz-validation`** middleware for Form 4 blocking and score caps.

### Added (PRD Task 4 — AI layer / Vercel AI SDK + Groq)

- **`ai` + `@ai-sdk/groq`** — Vercel AI SDK with Groq-only provider (no paid OpenAI/Anthropic).
- **`lib/ai/client.js`** — `streamAIText`, `generateAIText`, `generateAIObject` with retries and logging.
- **`lib/ai/schemas.js`** — Zod schemas: lesson plan, rubric, SBA, ECZ exam, quiz, practice paper, report comment.
- **`lib/ai/structured-lesson-plan.js`** — Validated CBC lesson plans + plain-text formatter.
- **`docs/AI_GUIDE.md`** — Features list, how to add AI, cost, debugging, schema reference.
- **`LessonPlan` Prisma fields** — `structuredContent`, `generatedAt`, `aiModel`.

### Changed (PRD Task 4)

- **`lib/ai/groq-client.ts`** — Delegates to Vercel AI SDK (streaming SSE format unchanged for UI).
- **`POST /api/lesson-plans/generate`** — Default structured CBC plan; `format=ministry` for legacy plain-text.
- **`POST /api/ai/quiz-maker`**, **`POST /api/ai/ecz-practice`** — `generateAIObject` + Zod validation.
- **`lib/aiml/tools/quiz-maker.ts`**, **`ecz-practice-papers.ts`** — Same structured generation.

### Added (PRD Task 3 — Test infrastructure)

- **Vitest** — `vitest.config.js`, `__tests__/setup.js`, Prisma/request/next-server helpers.
- **Critical path API tests** — `__tests__/api/auth.test.js`, `onboarding.test.js`, `sba.test.js`, `ecz.test.js` (27 cases).
- **`docs/TESTING.md`** — How to run tests, write new tests, mock Prisma/services, coverage targets.
- **`lib/ecz/ecz-compliance.js`** — `getSBASubmissionDeadline()`, `getSBAWeight()` (PE 40%, others 30%) for tests and ECZ routes.

### Changed (PRD Task 3)

- **`package.json` scripts** — `npm test` runs Vitest; `npm run test:jest` keeps legacy Jest suites.
- **Dev dependencies** — `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `msw`.

### Added (PRD Task 2 — Observability)

- **Sentry** — `sentry.client.config.js`, `sentry.server.config.js`, `sentry.edge.config.js`, `instrumentation.js`, `instrumentation-client.js`; `next.config.js` wrapped with `withSentryConfig` (production + DSN required).
- **Structured logging** — `lib/utils/logger.js` with route-scoped `logger({ schoolId, userId, route })`, JSON logs in production, `captureError()` for Sentry with sensitive-field stripping.
- **`docs/DEVELOPER_GUIDE.md`** — copy-paste template for logging new API routes.

### Changed (PRD Task 2)

- **Instrumented routes:** `/api/auth/login`, `/api/onboarding/complete`, `/api/onboarding/lipila/callback`, `/api/lesson-plans/generate`, `/api/dashboard/headteacher`.
- **`lib/middleware/errorHandler.js`** — uses `captureError` for unhandled API exceptions.

### Changed (Sentry wizard + MCP)

- **Sentry wizard** (`zinks-0m/javascript-nextjs`): consolidated `next.config.js` (single `withSentryConfig`, tunnel `/monitoring`), env-based DSN via `lib/sentry/options.js`, TypeScript server/edge configs, Session Replay on client.
- **`.cursor/mcp.json`** — Sentry MCP for investigating issues from Cursor (`https://mcp.sentry.dev/mcp/zinks-0m/javascript-nextjs`).
- Removed hardcoded DSN from committed config files; use `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` in environment.

### Added (PRD Task 1 — Environment validation)

- **`lib/config/env.js`** — Startup validation for required env vars (`DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, email from address, `GROQ_API_KEY`); optional-var warnings in development; `env` helper with feature flags (`payments`, `sms`, `ai`, `email`).
- **`docs/ENVIRONMENT.md`** — Full variable reference, local setup, Vercel deployment, and health-check usage.
- **`.env.example`** — Updated template aligned with production and optional integrations (Lipila, Africa's Talking, Sentry placeholders).

### Changed (PRD Task 1)

- **`app/layout.js`** — Calls `validateEnv()` on server startup so misconfiguration fails fast with a clear message.
- **`GET /api/health`** — Returns database connectivity plus feature-flag status (`email`, `ai`, `sms`, `payments`); `503` when DB is unreachable. Use `?live=1` for fast liveness without a DB probe (replaces old default no-DB behavior; use `/api/ping` for minimal checks).

## [2.1.0] - 2026-02-13

### Added

- **Testing Suite**: Installed Jest and React Testing Library. Added critical path tests for Authentication and Payment systems.
- **Code Quality**: Configured ESLint, Prettier, Husky, and lint-staged for automated code formatting and linting.
- **Documentation**: Created `API_DOCS.md`, `CODE_QUALITY.md`, `PERFORMANCE.md`, `UX_IMPROVEMENTS.md`, and updated `README.md`.
- **Sitemap & Robots**: Added `sitemap.xml` and `robots.txt` for SEO.

### Changed

- **Mobile Responsive Tables**: Overhauled `ResultsPage` and `TimetablePage` to use mobile-first card layouts instead of horizontal-scrolling tables.
- **Image Optimization**: Replaced all native `<img>` tags with Next.js `Image` component in `StudentWorkShowcase`, `MultimediaLessonCreator`, and `ProfilePictureUpload`.
- **Accessibility**: Enforced 44x44px minimum touch targets for all buttons and interactive elements.
- **Performance**: Implemented lazy loading for heavy dashboard components to improve LCP scores.
- **SEO Metadata**: Updated `layout.js` with comprehensive meta tags, Open Graph, and Twitter Cards.

### Fixed

- Horizontal overflow issues in Timetable navigation.
- Profile picture loading performance on mobile devices.
- Inconsistent button sizing across dashboard modules.
