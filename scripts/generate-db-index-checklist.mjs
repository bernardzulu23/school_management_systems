import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const schema = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'schema.prisma'),
  'utf8'
)

const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
const rows = []

for (const [, name, body] of models) {
  const hasSchoolIdField = /\bschoolId\b/.test(body)
  if (!hasSchoolIdField) continue

  const schoolIdIndexed = /@@index\(\[schoolId/.test(body) || /@@index\(\[schoolId,/.test(body)
  const missing = []
  for (const fk of ['userId', 'classId', 'subjectId', 'studentId', 'teacherId']) {
    if (new RegExp(`\\b${fk}\\b`).test(body) && !new RegExp(`@@index\\(\\[${fk}`).test(body)) {
      missing.push(fk)
    }
  }
  rows.push({ name, schoolIdIndexed, missing })
}

let md = '# Database index checklist\n\n'
md += 'Auto-generated from `prisma/schema.prisma`. Run `node scripts/generate-db-index-checklist.mjs` to refresh.\n\n'
md += '| Model | schoolId indexed | Other missing indexes |\n'
md += '|-------|------------------|-------------------------|\n'
for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  md += `| ${r.name} | ${r.schoolIdIndexed ? 'yes' : '**MISSING**'} | ${r.missing.length ? r.missing.join(', ') : '—'} |\n`
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'database-index-checklist.md')
fs.writeFileSync(out, md)
console.log('Wrote', out, `(${rows.length} models with schoolId)`)
