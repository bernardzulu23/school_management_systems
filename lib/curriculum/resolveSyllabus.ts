import { prisma } from '@/lib/prisma'
import type { SyllabusVersion } from '@prisma/client'

export interface SyllabusResolution {
  syllabusVersion: SyllabusVersion
  displayLabel: string
}

/**
 * Resolve which syllabus is nationally active for a canonical secondary level
 * (SS1/SS2/SS3) in a given academic year.
 *
 * Extension point for a future TenantCurriculumOverride table — intentionally
 * not built yet; add a lookup here first if that ever becomes necessary.
 */
export async function resolveSyllabus(
  canonicalLevel: string,
  academicYear: number
): Promise<SyllabusResolution> {
  const row = await prisma.curriculumRollout.findFirst({
    where: {
      canonicalLevel: String(canonicalLevel || '').trim(),
      academicYear: Number(academicYear),
    },
  })

  if (!row) {
    throw new Error(
      `No CurriculumRollout row for ${canonicalLevel} / ${academicYear}. Seed data may be incomplete.`
    )
  }

  return {
    syllabusVersion: row.syllabusVersion,
    displayLabel: row.displayLabel,
  }
}
