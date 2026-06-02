/**
 * Scans API routes for Prisma calls missing schoolId in the query block.
 * Run: npm run audit:tenant
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const API_DIR = path.join(ROOT, 'app', 'api')

const PRISMA_METHODS = [
  'findMany',
  'findFirst',
  'findUnique',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'create',
  'createMany',
  'upsert',
  'aggregate',
  'groupBy',
]

const SKIP_PATH_PREFIXES = ['app/api/platform', 'app/api/public', 'app/api/onboarding', 'app/api/health', 'app/api/ping', 'app/api/cron', 'app/api/sms/inbound', 'app/api/sms/delivery', 'app/api/sms/queue-worker', 'app/api/sms/broadcast-dispatcher']

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else if (/route\.(js|ts)$/.test(name)) acc.push(full)
  }
  return acc
}

function findMatchingParen(text, openIndex) {
  let depth = 0
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length
}

function auditFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  if (SKIP_PATH_PREFIXES.some((p) => rel.startsWith(p.replace(/\//g, path.sep).replace(/\\/g, '/')) || rel.startsWith(p))) {
    return { skipped: true, rel, findings: [] }
  }

  const text = fs.readFileSync(filePath, 'utf8')
  const findings = []
  const re = /prisma\.(\w+)\.(\w+)\s*\(/g
  let m
  while ((m = re.exec(text)) !== null) {
    const model = m[1]
    const method = m[2]
    if (!PRISMA_METHODS.includes(method)) continue

    const openParen = m.index + m[0].length - 1
    const closeParen = findMatchingParen(text, openParen)
    if (closeParen < 0) continue

    const block = text.slice(openParen, closeParen + 1)
    const hasSchoolId = /schoolId/.test(block)
    const line = lineNumberAt(text, m.index)

    findings.push({
      model,
      method,
      line,
      status: hasSchoolId ? 'OK' : 'VULNERABLE',
    })
  }

  return { skipped: false, rel, findings }
}

const files = walk(API_DIR)
const vulnerable = []
let okCount = 0
let vulnCount = 0

for (const file of files) {
  const result = auditFile(file)
  if (result.skipped) continue
  for (const f of result.findings) {
    if (f.status === 'VULNERABLE') {
      vulnCount++
      vulnerable.push({ file: result.rel, ...f })
    } else {
      okCount++
    }
  }
}

const outPath = path.join(__dirname, 'tenant-audit-results.json')
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      scannedAt: new Date().toISOString(),
      totalRoutes: files.length,
      vulnerableCalls: vulnCount,
      safeCalls: okCount,
      vulnerable,
    },
    null,
    2
  )
)

console.log('Tenant isolation audit')
console.log('─────────────────────')
console.log(`Total route files scanned: ${files.length}`)
console.log(`Safe Prisma calls (schoolId present): ${okCount}`)
console.log(`Vulnerable Prisma calls: ${vulnCount}`)
console.log(`Results written to: ${path.relative(ROOT, outPath)}`)
if (vulnerable.length) {
  console.log('\nVulnerable (review manually — some may be false positives):')
  for (const v of vulnerable.slice(0, 40)) {
    console.log(`  ${v.file}:${v.line} prisma.${v.model}.${v.method}`)
  }
  if (vulnerable.length > 40) console.log(`  … and ${vulnerable.length - 40} more`)
}
