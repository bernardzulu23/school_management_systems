/**
 * Phase 3 — API route migration progress + checklist.
 *
 * Usage:
 *   npx tsx scripts/check-api-handler-migration.ts
 *   npx tsx scripts/check-api-handler-migration.ts --checklist
 *   npx tsx scripts/check-api-handler-migration.ts --dir app/api/sms
 *   npx tsx scripts/check-api-handler-migration.ts --fail-under 5   # CI smoke: at least N migrated
 *
 * Migrated = file imports withApiHandler from @/lib/middleware/withApiHandler
 * Remaining = route files that still use withErrorHandler / withSecureHandler / authMiddleware
 *            without withApiHandler (candidates).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const API_ROOT = path.join(ROOT, 'app', 'api')

const CHECKLIST = `
## Phase 3 — migrate remaining /app/api routes safely

### Per-route recipe
1. Replace \`withErrorHandler\` / manual \`authMiddleware\` + \`roleCheck\` + \`resolveAuthenticatedSchoolId\`
   with \`withApiHandler(handler, options)\`.
2. Options map:
   - roles: string[] OR (user) => boolean
   - feature: planGate id (e.g. 'sms-alerts', 'fee-management', 'basic-results')
   - schoolTypes: ['SCHOOL'] | ['INDIVIDUAL'] when needed
   - body / query: Zod schemas (prefer lib/schemas)
   - tenant: false only for platform/public/session bootstrap (auth/me pattern)
   - auth: false for public webhooks/login (still prefer domain-specific secret checks)
   - after: ownership / school-type extras (see fees/summary)
3. Handler receives \`{ request, user, schoolId, userId, db, body, query, params }\`.
   Prefer \`db\` (getTenantClient) for tenant tables; do not trust body.schoolId.
4. Return \`apiOk({ ... })\` or a Response. Throw \`ApiError(message, status, { code, details })\`.
5. Keep \`export const dynamic = 'force-dynamic'\` where present.
6. Smoke-test: unauthenticated → 401; wrong role → 403; bad body → 400 VALIDATION_FAILED;
   happy path → success:true. Confirm production 500 responses have no stack / raw UUIDs.

### Batch order (recommended)
1. app/api/dashboard/*
2. app/api/fees/*  (retire authorizeFeeRoute once all fees routes migrated)
3. app/api/sms/*
4. app/api/students/*, app/api/teachers/*, app/api/attendance/*, app/api/results/*
5. app/api/admin/*, app/api/timetable/*
6. app/api/ai/* (keep AI rate limits; compose inside \`after\` or call before return)
7. Leave for last: auth/login, payments webhooks, ussd, platform — often auth:false + custom secrets

### Safety rules
- One directory at a time; commit after smoke tests.
- Do not change response JSON shapes clients depend on (wrap with apiOk carefully).
- Public routes: { auth: false } + keep existing signature/secret checks.
- Platform routes: { tenant: false } or platformAuth helpers — do not force getTenantContext.
- After migrating a folder, run: npx tsx scripts/check-api-handler-migration.ts --dir <folder>
- Optional CI: npm run check:api-handlers -- --fail-under 5

### Reference examples (already migrated)
- results: app/api/dashboard/results/route.js
- fees:    app/api/fees/summary/route.js
- sms:     app/api/sms/balance/route.js
- auth:    app/api/auth/me/route.js
- admin:   app/api/admin/notifications/[notificationId]/read/route.js
`.trim()

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/^route\.(js|ts|jsx|tsx)$/.test(ent.name)) out.push(p)
  }
  return out
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, '/')
}

function classify(file: string) {
  const src = fs.readFileSync(file, 'utf8')
  const migrated = /from\s+['"]@\/lib\/middleware\/withApiHandler['"]/.test(src)
  const legacyStack =
    /withErrorHandler|withSecureHandler|authMiddleware|resolveAuthenticatedSchoolId/.test(src)
  return { migrated, legacyStack, src }
}

function main() {
  if (process.argv.includes('--checklist')) {
    console.log(CHECKLIST)
    process.exit(0)
  }

  const dirArg = process.argv.find((a) => a.startsWith('--dir='))
  const dirIdx = process.argv.indexOf('--dir')
  const scopeRel =
    (dirArg && dirArg.slice('--dir='.length)) ||
    (dirIdx >= 0 ? process.argv[dirIdx + 1] : null) ||
    'app/api'
  const scopeAbs = path.join(ROOT, scopeRel.replace(/\\/g, '/'))

  const failUnderIdx = process.argv.indexOf('--fail-under')
  const failUnder = failUnderIdx >= 0 ? Number(process.argv[failUnderIdx + 1]) : Number.NaN

  const files = walk(scopeAbs)
  const migrated: string[] = []
  const candidates: string[] = []
  const other: string[] = []

  for (const f of files) {
    const { migrated: isMig, legacyStack } = classify(f)
    const r = rel(f)
    if (isMig) migrated.push(r)
    else if (legacyStack) candidates.push(r)
    else other.push(r)
  }

  console.log(`API handler migration (${scopeRel})`)
  console.log(`  route files:     ${files.length}`)
  console.log(`  withApiHandler:  ${migrated.length}`)
  console.log(`  still legacy:    ${candidates.length}`)
  console.log(`  other/publicish: ${other.length}`)

  if (migrated.length && process.argv.includes('--list-migrated')) {
    console.log('\nMigrated:')
    for (const m of migrated.sort()) console.log(`  ✓ ${m}`)
  }

  if (candidates.length && process.argv.includes('--list')) {
    console.log('\nCandidates (sample up to 40):')
    for (const c of candidates.sort().slice(0, 40)) console.log(`  · ${c}`)
    if (candidates.length > 40) console.log(`  … +${candidates.length - 40} more`)
  }

  if (Number.isFinite(failUnder) && migrated.length < failUnder) {
    console.error(
      `\ncheck-api-handler-migration: expected at least ${failUnder} migrated routes, found ${migrated.length}`
    )
    process.exit(1)
  }

  console.log('\nTip: npx tsx scripts/check-api-handler-migration.ts --checklist')
}

main()
