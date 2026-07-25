/**
 * Seed CurriculumRollout rows programmatically (no hand-typed table).
 *
 * Usage:
 *   npx tsx prisma/seed-curriculum-rollout.ts
 *   npm run seed:curriculum-rollout
 */
import { PrismaClient } from '@prisma/client'
import { buildCurriculumRolloutRows } from '../lib/curriculum/curriculumRollout'

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

  // Phase 1 gate checks
  const gates = [
    { canonicalLevel: 'SS1', academicYear: 2027, expect: 'CBC' },
    { canonicalLevel: 'SS2', academicYear: 2027, expect: 'OLD_SYLLABUS' },
    { canonicalLevel: 'SS3', academicYear: 2028, expect: 'OLD_SYLLABUS' },
    { canonicalLevel: 'SS3', academicYear: 2029, expect: 'CBC' },
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
