import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { weeksFromSchemeJson } from '@/lib/teaching/performanceSummary'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const schemeId = searchParams.get('schemeId')
  const teacherIdParam = searchParams.get('teacherId')

  const isAdmin = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  const teacherId = isAdmin && teacherIdParam ? teacherIdParam : String(user.id)

  const schemes = await prisma.schemeOfWork.findMany({
    where: {
      schoolId,
      teacherId,
      ...(schemeId ? { id: schemeId } : {}),
    },
    include: {
      progress: true,
      testSchedule: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const mastery = await prisma.topicMastery.findMany({
    where: { schoolId, teacherId },
    orderBy: { averageMasteryScore: 'asc' },
  })

  const schemeAnalytics = schemes.map((scheme) => {
    const weeks = weeksFromSchemeJson(scheme.weeks)
    const completed = scheme.progress.filter((p) => p.completed)
    const totalWeeks = weeks.length || 1
    const coveragePercent = Math.round((completed.length / totalWeeks) * 100)

    const plannedTopics = weeks.map((w) => ({
      week: w.week,
      topic: w.topic || `Week ${w.week}`,
      completed: completed.some((p) => p.weekNumber === w.week),
      completedAt: completed.find((p) => p.weekNumber === w.week)?.completedAt ?? null,
    }))

    const relatedMastery = mastery.filter((m) =>
      plannedTopics.some(
        (t) =>
          t.topic.toLowerCase().includes(m.topicName.toLowerCase()) ||
          m.topicName.toLowerCase().includes(t.topic.toLowerCase())
      )
    )

    const testSchedule = []
    if (scheme.testSchedule?.midTermWeek != null) {
      testSchedule.push({
        id: `${scheme.id}-mid`,
        testType: 'MID_TERM',
        scheduledWeek: scheme.testSchedule.midTermWeek,
      })
    }
    if (scheme.testSchedule?.endOfTermWeek != null) {
      testSchedule.push({
        id: `${scheme.id}-eot`,
        testType: 'END_OF_TERM',
        scheduledWeek: scheme.testSchedule.endOfTermWeek,
      })
    }

    const averageMastery =
      relatedMastery.length === 0
        ? null
        : relatedMastery.reduce((s, m) => s + m.averageMasteryScore, 0) / relatedMastery.length

    return {
      schemeId: scheme.id,
      subject: scheme.subject,
      gradeOrForm: scheme.gradeOrForm,
      term: scheme.term,
      year: scheme.year,
      status: scheme.status,
      coveragePercent,
      completionRate: coveragePercent,
      completedWeeks: completed.length,
      totalWeeks,
      midTermWeek: scheme.testSchedule?.midTermWeek ?? null,
      endOfTermWeek: scheme.testSchedule?.endOfTermWeek ?? null,
      plannedTopics,
      topics: relatedMastery.map((m) => ({
        id: m.id,
        topicName: m.topicName,
        averageMasteryScore: m.averageMasteryScore,
        studentCount: m.studentCount,
        assessmentsCount: m.assessmentCount,
        needsReteaching: m.needsReteaching,
      })),
      topicsNeedingReteach: relatedMastery.filter((m) => m.needsReteaching),
      topicsNeedingReteachCount: relatedMastery.filter((m) => m.needsReteaching).length,
      averageMastery,
      testSchedule,
    }
  })

  const focus = schemeId ? schemeAnalytics[0] || null : null

  const overallCoverage =
    schemeAnalytics.length === 0
      ? 0
      : Math.round(
          schemeAnalytics.reduce((s, a) => s + a.coveragePercent, 0) / schemeAnalytics.length
        )

  const overallAvgMasteryRows = mastery
  const averageMastery =
    overallAvgMasteryRows.length === 0
      ? 0
      : overallAvgMasteryRows.reduce((s, m) => s + m.averageMasteryScore, 0) /
        overallAvgMasteryRows.length

  return NextResponse.json({
    overallCoverage,
    completionRate: focus?.completionRate ?? overallCoverage,
    completedWeeks:
      focus?.completedWeeks ?? schemeAnalytics.reduce((s, a) => s + a.completedWeeks, 0),
    totalWeeks: focus?.totalWeeks ?? schemeAnalytics.reduce((s, a) => s + a.totalWeeks, 0),
    averageMastery: focus?.averageMastery ?? averageMastery,
    topicsNeedingReteach: focus
      ? focus.topicsNeedingReteachCount
      : mastery.filter((m) => m.needsReteaching).length,
    topics:
      focus?.topics ??
      mastery.map((m) => ({
        id: m.id,
        topicName: m.topicName,
        averageMasteryScore: m.averageMasteryScore,
        studentCount: m.studentCount,
        assessmentsCount: m.assessmentCount,
        needsReteaching: m.needsReteaching,
      })),
    testSchedule: focus?.testSchedule ?? [],
    schemes: schemeAnalytics,
    topicsNeedingReteachList: mastery.filter((m) => m.needsReteaching),
  })
})
