import { prisma } from '@/lib/prisma'

const RETEACH_THRESHOLD = 60

export function parseTermNumber(term: string | number | null | undefined): number {
  if (typeof term === 'number' && Number.isFinite(term)) return Math.min(3, Math.max(1, term))
  const m = String(term || '').match(/(\d+)/)
  const n = m ? Number(m[1]) : 1
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 1
}

export function weeksFromSchemeJson(weeks: unknown): Array<{ week: number; topic?: string }> {
  if (!Array.isArray(weeks)) return []
  return weeks
    .map((w, i) => {
      if (!w || typeof w !== 'object') return null
      const row = w as Record<string, unknown>
      const week = Number(row.week ?? i + 1)
      const topic = row.topic != null ? String(row.topic) : undefined
      return { week: Number.isFinite(week) ? week : i + 1, topic }
    })
    .filter(Boolean) as Array<{ week: number; topic?: string }>
}

/** Recalculate and upsert TeacherPerformanceSummary for a teacher/term. */
export async function recalculateTeacherPerformanceSummary(opts: {
  schoolId: string
  teacherId: string
  term: number
  academicYear: number
}) {
  const { schoolId, teacherId, term, academicYear } = opts
  const termLabel = `Term ${term}`

  const schemes = await prisma.schemeOfWork.findMany({
    where: { schoolId, teacherId, year: academicYear, term: termLabel },
    select: { id: true, weeks: true },
  })

  let totalWeeksPlanned = 0
  for (const s of schemes) {
    totalWeeksPlanned += weeksFromSchemeJson(s.weeks).length
  }

  const schemeIds = schemes.map((s) => s.id)
  const completedCount =
    schemeIds.length === 0
      ? 0
      : await prisma.schemeProgress.count({
          where: { schoolId, teacherId, schemeId: { in: schemeIds }, completed: true },
        })

  const masteryRows = await prisma.topicMastery.findMany({
    where: { schoolId, teacherId },
    select: { averageMasteryScore: true, needsReteaching: true },
  })

  const averageMasteryScore =
    masteryRows.length === 0
      ? 0
      : masteryRows.reduce((sum, r) => sum + r.averageMasteryScore, 0) / masteryRows.length

  const topicsNeedingReteach = masteryRows.filter((r) => r.needsReteaching).length
  const completionRate = totalWeeksPlanned > 0 ? (completedCount / totalWeeksPlanned) * 100 : 0

  return prisma.teacherPerformanceSummary.upsert({
    where: {
      schoolId_teacherId_term_academicYear: {
        schoolId,
        teacherId,
        term,
        academicYear,
      },
    },
    create: {
      schoolId,
      teacherId,
      term,
      academicYear,
      completionRate,
      averageMasteryScore,
      topicsNeedingReteach,
      totalSchemesAssigned: schemes.length,
      totalWeeksPlanned,
      totalWeeksCompleted: completedCount,
    },
    update: {
      completionRate,
      averageMasteryScore,
      topicsNeedingReteach,
      totalSchemesAssigned: schemes.length,
      totalWeeksPlanned,
      totalWeeksCompleted: completedCount,
    },
  })
}

export { RETEACH_THRESHOLD }
