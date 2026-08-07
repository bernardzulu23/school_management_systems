/**
 * Seed CurriculumRollout rows programmatically (no hand-typed table).
 *
 * Usage:
 *   npx tsx prisma/seed-curriculum-rollout.ts
 *   npm run seed:curriculum-rollout
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { buildCurriculumRolloutRows } from '../lib/curriculum/curriculumRollout'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return
  const raw = String(readFileSync(filePath, 'utf8') || '')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const idx = withoutExport.indexOf('=')
    if (idx <= 0) continue
    const key = withoutExport.slice(0, idx).trim()
    let value = withoutExport.slice(idx + 1).trim()
    if (!key) continue
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'))
loadEnvFile(path.join(__dirname, '..', '.env.local'))

const prisma = new PrismaClient()

async function main() {
  const rows = buildCurriculumRolloutRows()

  for (const row of rows) {
    await prisma.curriculumRollout.upsert({
      where: {
        canonicalLevel_academicYear: {
          canonicalLevel: row.canonicalLevel,
          academicYear: row.academicYear,
        },
      },
      update: {
        displayLabel: row.displayLabel,
        syllabusVersion: row.syllabusVersion,
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        notes: row.notes,
      },
      create: row,
    })
  }

  console.log(`Seeded ${rows.length} CurriculumRollout rows.`)

  // Phase 1 gate checks (MoE: SS1 CBC 2025, SS2 CBC 2026, SS3 CBC 2027)
  const gates = [
    { canonicalLevel: 'SS1', academicYear: 2025, expect: 'CBC' },
    { canonicalLevel: 'SS2', academicYear: 2025, expect: 'OLD_SYLLABUS' },
    { canonicalLevel: 'SS2', academicYear: 2026, expect: 'CBC' },
    { canonicalLevel: 'SS3', academicYear: 2026, expect: 'OLD_SYLLABUS' },
    { canonicalLevel: 'SS3', academicYear: 2027, expect: 'CBC' },
  ] as const

  let failed = 0
  for (const g of gates) {
    const row = await prisma.curriculumRollout.findUnique({
      where: {
        canonicalLevel_academicYear: {
          canonicalLevel: g.canonicalLevel,
          academicYear: g.academicYear,
        },
      },
    })
    const actual = row?.syllabusVersion
    const ok = actual === g.expect
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${g.canonicalLevel}/${g.academicYear}: expected ${g.expect}, got ${actual}`
    )
    if (!ok) failed += 1
  }

  if (failed > 0) {
    throw new Error(`CurriculumRollout gate failed (${failed} row(s))`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
