import { SBA_ENTRY_START_YEAR } from '@/lib/sba/constants'
import { levelAtOrAbove, yearGroupToCanonicalLevel } from '@/lib/sba/levelComparator'
import { resolveSyllabus } from '@/lib/curriculum/resolveSyllabus'

/**
 * Active secondary SBA subject policies for a class level + academic year.
 * Empty when academicYear < 2026 or level is below policy startsAtLevel.
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {{ schoolId: string, level: string, academicYear: number, syllabusVersion?: string }} opts
 */
export async function resolveSecondarySBASubjects(db, opts) {
  const schoolId = String(opts?.schoolId || '').trim()
  const level = String(opts?.level || '').trim()
  const academicYear = Number(opts?.academicYear)

  if (!schoolId || !Number.isFinite(academicYear)) {
    return { subjects: [], emptyReason: 'INVALID_ARGS', academicYear, startsAtLevelHint: null }
  }

  if (academicYear < SBA_ENTRY_START_YEAR) {
    return {
      subjects: [],
      emptyReason: 'ENTRY_YEAR',
      academicYear,
      startsAtLevelHint: null,
      message: `SBA entry starts in academic year ${SBA_ENTRY_START_YEAR}`,
    }
  }

  let syllabusVersion = opts?.syllabusVersion
  if (!syllabusVersion) {
    const canonical = yearGroupToCanonicalLevel(level)
    if (!canonical) {
      return {
        subjects: [],
        emptyReason: 'UNKNOWN_LEVEL',
        academicYear,
        startsAtLevelHint: null,
      }
    }
    const resolved = await resolveSyllabus(canonical, academicYear)
    syllabusVersion = resolved.syllabusVersion
  }

  const policies = await db.sBASubjectPolicy.findMany({
    where: {
      schoolId,
      isActive: true,
      syllabusVersion,
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      components: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { subject: { name: 'asc' } },
  })

  const eligible = policies.filter((p) => levelAtOrAbove(level, p.startsAtLevel))

  if (policies.length > 0 && eligible.length === 0) {
    const minStart =
      policies.map((p) => p.startsAtLevel).sort((a, b) => String(a).localeCompare(String(b)))[0] ||
      'Form 2'
    return {
      subjects: [],
      emptyReason: 'STARTS_AT_LEVEL',
      academicYear,
      syllabusVersion,
      startsAtLevelHint: minStart,
      message: `SBA recording begins at ${minStart}`,
    }
  }

  return {
    subjects: eligible.map((p) => ({
      policyId: p.id,
      subjectId: p.subjectId,
      subjectName: p.subject?.name,
      subjectCode: p.subject?.code,
      syllabusVersion: p.syllabusVersion,
      startsAtLevel: p.startsAtLevel,
      sourceDocument: p.sourceDocument,
      components: p.components,
      weightsSum: p.components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0),
    })),
    emptyReason: eligible.length === 0 ? 'NO_POLICIES' : null,
    academicYear,
    syllabusVersion,
    startsAtLevelHint: null,
  }
}

/**
 * @param {string} role
 * @param {string[]} lockRoles from LOCK_ROLE_REQUIREMENT
 */
export function canLockSbaRecords(role, lockRoles) {
  const r = String(role || '')
    .trim()
    .toLowerCase()
  return (lockRoles || []).some((allowed) => String(allowed).trim().toLowerCase() === r)
}
