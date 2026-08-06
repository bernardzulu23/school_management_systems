/**
 * CI static check: fail if NEW unscoped Prisma access on tenant models is introduced.
 *
 * Strategy:
 * - Scan app/api + lib for `prisma.<tenantModel>.<op>` / `basePrisma.<…>`
 * - Compare against scripts/tenant-scoping-baseline.json
 * - Exit 1 only when violations are not in the baseline (new risk)
 * - Exit 1 when `--update-baseline` is not used and foundation files are missing
 *
 * Usage:
 *   npx tsx scripts/check-tenant-scoping.ts
 *   npx tsx scripts/check-tenant-scoping.ts --update-baseline
 *   npx tsx scripts/check-tenant-scoping.ts --strict   # ignore baseline; fail on any hit
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const BASELINE_PATH = path.join(ROOT, 'scripts', 'tenant-scoping-baseline.json')
const SCAN_DIRS = [path.join(ROOT, 'app', 'api'), path.join(ROOT, 'lib')]

const ALLOWLIST = new Set([
  'lib/prisma/client.js',
  'lib/prisma/tenantClient.js',
  'lib/tenant/context.js',
  'lib/tenant/resolveSchoolId.js',
  'lib/tenant/scoped-models.js',
  'lib/db/school-context.js',
  'lib/utils/resolveSchoolId.js',
  'lib/utils/getSchoolId.js',
  'lib/ussd/parent-portal.js',
])

const REQUIRED_FOUNDATION = [
  'lib/tenant/context.js',
  'lib/prisma/tenantClient.js',
  'lib/tenant/scoped-models.js',
  'lib/db/school-context.js',
]

const TENANT_MODELS = new Set([
  'user',
  'student',
  'teacher',
  'class',
  'subject',
  'department',
  'result',
  'attendance',
  'attendanceMark',
  'attendanceSession',
  'eczAssessment',
  'eczAssessmentScore',
  'termReport',
  'schoolFeePayment',
  'parentProfile',
  'parentStudentLink',
  'consentRecord',
  'schoolMaterial',
  'materialChunk',
  'timetableEntry',
  'timetableAllocationEntry',
  'smsBroadcast',
  'smsQueueItem',
  'smsLog',
  'auditLog',
  'teachingAssignment',
  'notification',
  'classroom',
  'goal',
  'studyMaterial',
  'lessonPlan',
])

const UNSAFE =
  /\b(prisma|basePrisma)\s*\.\s*([a-z][a-zA-Z0-9]*)\s*\.\s*(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|create|createMany|update|updateMany|upsert|delete|deleteMany|count|aggregate|groupBy)\b/g

type Hit = { key: string; file: string; line: number; snippet: string }

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, out)
    } else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) {
      out.push(p)
    }
  }
  return out
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, '/')
}

function collectHits(): Hit[] {
  const hits: Hit[] = []
  for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
    const r = rel(file)
    if (ALLOWLIST.has(r)) continue
    if (r.includes('__tests__') || r.includes('.test.') || r.includes('.spec.')) continue

    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
      UNSAFE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = UNSAFE.exec(line)) !== null) {
        const model = m[2]
        if (!TENANT_MODELS.has(model)) continue
        const key = `${r}:${i + 1}:${model}.${m[3]}`
        hits.push({
          key,
          file: r,
          line: i + 1,
          snippet: line.trim().slice(0, 160),
        })
      }
    })
  }
  return hits
}

function main() {
  const updateBaseline = process.argv.includes('--update-baseline')
  const strict = process.argv.includes('--strict')

  for (const f of REQUIRED_FOUNDATION) {
    if (!fs.existsSync(path.join(ROOT, f))) {
      console.error(`check-tenant-scoping: missing foundation file ${f}`)
      process.exit(1)
    }
  }

  const hits = collectHits()

  if (updateBaseline) {
    const payload = {
      updatedAt: new Date().toISOString(),
      keys: hits.map((h) => h.key).sort(),
    }
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n')
    console.log(
      `check-tenant-scoping: wrote baseline (${payload.keys.length} keys) → ${rel(BASELINE_PATH)}`
    )
    process.exit(0)
  }

  if (strict) {
    if (hits.length) {
      console.error(`check-tenant-scoping --strict: ${hits.length} unscoped call(s):\n`)
      for (const h of hits.slice(0, 60)) {
        console.error(`  ${h.file}:${h.line}  ${h.snippet}`)
      }
      process.exit(1)
    }
    console.log('check-tenant-scoping --strict: ok')
    process.exit(0)
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(
      `check-tenant-scoping: missing ${rel(BASELINE_PATH)}. Run:\n  npx tsx scripts/check-tenant-scoping.ts --update-baseline`
    )
    process.exit(1)
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as { keys: string[] }
  const known = new Set(baseline.keys || [])
  const novel = hits.filter((h) => !known.has(h.key))

  // Also fail if baseline key line moved / removed model without updating — allow shrinkage
  if (novel.length) {
    console.error(`check-tenant-scoping: ${novel.length} NEW unscoped tenant Prisma call(s):\n`)
    for (const h of novel.slice(0, 80)) {
      console.error(`  ${h.file}:${h.line}`)
      console.error(`    ${h.snippet}`)
    }
    console.error(
      '\nUse getTenantContext() / getTenantClient(schoolId), or regenerate baseline only after intentional allow:\n  npx tsx scripts/check-tenant-scoping.ts --update-baseline\n'
    )
    process.exit(1)
  }

  console.log(
    `check-tenant-scoping: ok (${hits.length} known debt, 0 new; baseline ${known.size} keys)`
  )
}

main()
