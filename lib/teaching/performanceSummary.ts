import { prisma } from '@/lib/prisma'
import {
  endOfTermWeeksFromSchedule,
  midTermWeeksFromSchedule,
  testWeekSetFromSchedule,
  weekKindFromRow,
  type TestScheduleLike,
} from '@/lib/teaching/testWeeks'

const RETEACH_THRESHOLD = 60

export function parseTermNumber(term: string | number | null | undefined): number {
  if (typeof term === 'number' && Number.isFinite(term)) return Math.min(3, Math.max(1, term))
  const m = String(term || '').match(/(\d+)/)
  const n = m ? Number(m[1]) : 1
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 1
}

export function weeksFromSchemeJson(
  weeks: unknown
): Array<{ week: number; topic?: string; weekType?: string }> {
  if (!Array.isArray(weeks)) return []
  return weeks
    .map((w, i) => {
      if (!w || typeof w !== 'object') return null
      const row = w as Record<string, unknown>
      const week = Number(row.week ?? i + 1)
      const topic = row.topic != null ? String(row.topic) : undefined
      const weekType = row.weekType != null ? String(row.weekType) : undefined
      return { week: Number.isFinite(week) ? week : i + 1, topic, weekType }
    })
    .filter(Boolean) as Array<{ week: number; topic?: string; weekType?: string }>
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
    select: {
      id: true,
      weeks: true,
      testSchedule: {
        select: {
          midTermWeek: true,
          midTermWeekEnd: true,
          endOfTermWeek: true,
          endOfTermWeekEnd: true,
        },
      },
    },
  })

  let totalWeeksPlanned = 0
  const teachableByScheme = new Map<string, Set<number>>()

  for (const s of schemes) {
    const weeks = weeksFromSchemeJson(s.weeks)
    const schedule = s.testSchedule as TestScheduleLike | null
    const testSet = testWeekSetFromSchedule(schedule)
    const teachable = new Set<number>()
    for (const w of weeks) {
      const kind = weekKindFromRow(w.week, w.weekType, schedule)
      if (kind === 'teaching' && !testSet.has(w.week)) {
        teachable.add(w.week)
      }
    }
    if (teachable.size === 0 && weeks.length === 0) continue
    teachableByScheme.set(s.id, teachable)
    totalWeeksPlanned += teachable.size
  }

  const schemeIds = schemes.map((s) => s.id)
  let completedCount = 0
  if (schemeIds.length > 0) {
    const progressRows = await prisma.schemeProgress.findMany({
      where: { schoolId, teacherId, schemeId: { in: schemeIds }, completed: true },
      select: { schemeId: true, weekNumber: true },
    })
    for (const row of progressRows) {
      const teachable = teachableByScheme.get(row.schemeId)
      if (teachable?.has(row.weekNumber)) completedCount += 1
    }
  }

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

export { RETEACH_THRESHOLD, midTermWeeksFromSchedule, endOfTermWeeksFromSchedule }
