/**
 * Seed secondary SBA subject policies.
 *
 * CBC: do not invent max marks — CBC_SBA_SOURCE_DOCUMENT is PENDING; leave CBC unseeded.
 * OLD_SYLLABUS: seed empty policy shells (no components / max marks) when
 * OLD_SYLLABUS_SBA_SOURCE_DOCUMENT is still TBD; attach components only when documented.
 *
 * Usage:
 *   npx tsx prisma/seed-sba-policies.ts [--schoolId=<id>]
 */
import { PrismaClient } from '@prisma/client'
import {
  CBC_SBA_SOURCE_DOCUMENT,
  SBA_DEFAULT_STARTS_AT_LEVEL,
  SBA_START_LEVEL_SOURCE,
} from '../lib/sba/constants'

const prisma = new PrismaClient()

/** Documented old-syllabus SBA figures — TBD until 2020/2022 source confirmed. */
export const OLD_SYLLABUS_SBA_SOURCE_DOCUMENT = 'TBD — ECZ 2020/2022 SBA figures unconfirmed'

/**
 * Named placeholders only — no invented CBC component totals.
 * When OLD_SYLLABUS_SBA_SOURCE_DOCUMENT is confirmed, add { componentType, maxRawMark, weight, sortOrder }.
 */
export const OLD_SYLLABUS_COMPONENT_TEMPLATES = []

async function main() {
  const schoolIdArg = process.argv.find((a) => a.startsWith('--schoolId='))
  const schoolIdFilter = schoolIdArg ? schoolIdArg.split('=')[1] : null

  const schools = await prisma.school.findMany({
    where: {
      ...(schoolIdFilter ? { id: schoolIdFilter } : {}),
      OR: [{ level: 'secondary' }, { level: 'combined' }],
    },
    select: { id: true, name: true, level: true },
  })

  console.log(
    `SBA seed: ${schools.length} secondary/combined school(s). ` +
      `startsAtLevel=${SBA_DEFAULT_STARTS_AT_LEVEL} (${SBA_START_LEVEL_SOURCE}). ` +
      `CBC skipped (${CBC_SBA_SOURCE_DOCUMENT}). ` +
      `Old syllabus source: ${OLD_SYLLABUS_SBA_SOURCE_DOCUMENT}`
  )

  let created = 0
  let skipped = 0

  for (const school of schools) {
    const subjects = await prisma.subject.findMany({
      where: {
        schoolId: school.id,
        OR: [{ educationLevel: 'secondary' }, { educationLevel: null }],
      },
      select: { id: true, name: true },
    })

    for (const subject of subjects) {
      // CBC intentionally unseeded until CBC_SBA_SOURCE_DOCUMENT exists.
      const existingOld = await prisma.sBASubjectPolicy.findUnique({
        where: {
          schoolId_subjectId_syllabusVersion: {
            schoolId: school.id,
            subjectId: subject.id,
            syllabusVersion: 'OLD_SYLLABUS',
          },
        },
      })

      if (existingOld) {
        skipped += 1
        continue
      }

      await prisma.sBASubjectPolicy.create({
        data: {
          schoolId: school.id,
          subjectId: subject.id,
          syllabusVersion: 'OLD_SYLLABUS',
          startsAtLevel: SBA_DEFAULT_STARTS_AT_LEVEL,
          sourceDocument: OLD_SYLLABUS_SBA_SOURCE_DOCUMENT,
          isActive: true,
          components: {
            create: OLD_SYLLABUS_COMPONENT_TEMPLATES.map((c, i) => ({
              schoolId: school.id,
              componentType: c.componentType,
              maxRawMark: c.maxRawMark ?? null,
              weight: c.weight ?? 0,
              sortOrder: c.sortOrder ?? i,
              label: c.label ?? null,
            })),
          },
        },
      })
      created += 1
    }
  }

  console.log(`Done. Created ${created} OLD_SYLLABUS policies; skipped ${skipped} existing.`)
  console.log('CBC policies: 0 (pending source document).')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
