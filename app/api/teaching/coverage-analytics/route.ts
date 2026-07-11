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

  const approvedPlans = await prisma.lessonPlan.findMany({
    where: {
      schoolId,
      createdByUserId: teacherId,
      status: 'APPROVED',
    },
    select: {
      id: true,
      subject: true,
      grade: true,
      term: true,
      topic: true,
      weekNumber: true,
      schemeId: true,
      approvedAt: true,
    },
  })

  const topicMatch = (a: string, b: string) => {
    const x = String(a || '')
      .toLowerCase()
      .trim()
    const y = String(b || '')
      .toLowerCase()
      .trim()
    if (!x || !y) return false
    return x === y || x.includes(y) || y.includes(x)
  }

  const schemeAnalytics = schemes.map((scheme) => {
    const weeks = weeksFromSchemeJson(scheme.weeks)
    const totalWeeks = weeks.length || 1

    const relevantPlans = approvedPlans.filter((p) => {
      if (p.schemeId && p.schemeId === scheme.id) return true
      const subjectOk = topicMatch(p.subject, scheme.subject)
      const gradeOk = topicMatch(p.grade, scheme.gradeOrForm)
      const termOk = !p.term || topicMatch(p.term, scheme.term)
      return subjectOk && gradeOk && termOk
    })

    // Prefer approved lesson plans; keep manual SchemeProgress as editable override
    const plannedTopics = weeks.map((w) => {
      const progressRow = scheme.progress.find((p) => p.weekNumber === w.week && p.completed)
      const byWeek = relevantPlans.find((p) => Number(p.weekNumber) === w.week)
      const byTopic = relevantPlans.find(
        (p) => p.weekNumber == null && topicMatch(p.topic, w.topic || '')
      )
      const approved = byWeek || byTopic
      const taught = Boolean(approved) || Boolean(progressRow)
      return {
        week: w.week,
        topic: w.topic || `Week ${w.week}`,
        completed: taught,
        completedAt: approved?.approvedAt ?? progressRow?.completedAt ?? null,
        lessonPlanId: approved?.id ?? null,
        source: approved ? 'approved_lesson_plan' : progressRow ? 'manual' : 'not_taught',
      }
    })

    const completedWeeks = plannedTopics.filter((t) => t.completed).length
    const coveragePercent = Math.round((completedWeeks / totalWeeks) * 100)

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
      completedWeeks,
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
      taughtRule: 'APPROVED lesson plans only',
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
