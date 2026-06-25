/**
 * One-off / cron: mark classes with no timetable allocations as inactive.
 *
 * Usage:
 *   node scripts/sync-class-active-flags.js [--school-id=UUID] [--term="Term 1"] [--year=2026]
 */
import prisma from '../lib/prisma.js'
import { syncClassActiveFlags } from '../lib/timetable/getActiveClasses.js'

function readArg(name, fallback = '') {
  const prefix = `--${name}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

async function main() {
  const schoolId = readArg('school-id')
  const term = readArg('term', 'Term 1')
  const academicYear = readArg('year', String(new Date().getFullYear()))

  const schools = schoolId
    ? [{ id: schoolId }]
    : await prisma.school.findMany({ where: { active: true }, select: { id: true, name: true } })

  for (const school of schools) {
    const before = await prisma.class.count({
      where: { schoolId: school.id, isActive: true },
    })
    await syncClassActiveFlags(prisma, school.id, {
      term,
      academicYear,
      assignmentsOnly: true,
    })
    const after = await prisma.class.count({
      where: { schoolId: school.id, isActive: true },
    })
    const label = school.name || school.id
    console.log(
      `[${label}] active classes: ${before} → ${after} (deactivated ${Math.max(0, before - after)})`
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
