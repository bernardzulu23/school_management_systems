/**
 * Sync SchemeProgress from lesson-plan approval.
 * A week counts as taught only when an APPROVED lesson plan exists for it.
 */

import { prisma } from '@/lib/prisma'
import {
  parseTermNumber,
  recalculateTeacherPerformanceSummary,
  weeksFromSchemeJson,
} from '@/lib/teaching/performanceSummary'

function topicMatch(a, b) {
  const x = String(a || '')
    .toLowerCase()
    .trim()
  const y = String(b || '')
    .toLowerCase()
    .trim()
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

/**
 * Resolve scheme + week for a lesson plan, then upsert SchemeProgress.
 * Prefer schemeId + weekNumber, then topicKey, then fuzzy topic text.
 * @param {{ lessonPlanId: string, taught: boolean }} opts
 */
export async function syncTaughtProgressFromLessonPlan({ lessonPlanId, taught }) {
  const plan = await prisma.lessonPlan.findUnique({
    where: { id: lessonPlanId },
  })
  if (!plan) return null

  let schemeId = plan.schemeId || null
  let weekNumber = plan.weekNumber != null ? Number(plan.weekNumber) : null
  let topicName = plan.topic || null
  let topicKey = plan.topicKey || null

  if (schemeId && weekNumber != null && Number.isFinite(weekNumber)) {
    const scheme = await prisma.schemeOfWork.findUnique({
      where: { id: schemeId },
      select: { weeks: true },
    })
    if (scheme) {
      const weeks = weeksFromSchemeJson(scheme.weeks)
      const row = weeks.find((w) => w.week === weekNumber)
      if (row) {
        topicName = row.topic || topicName
        topicKey = topicKey || row.topicKey || null
      }
    }
  } else if (!schemeId) {
    const termLabel = plan.term || null
    const schemes = await prisma.schemeOfWork.findMany({
      where: {
        schoolId: plan.schoolId,
        teacherId: plan.createdByUserId,
        subject: { equals: plan.subject, mode: 'insensitive' },
        gradeOrForm: { equals: plan.grade, mode: 'insensitive' },
        ...(termLabel ? { term: { equals: termLabel, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    for (const scheme of schemes) {
      const weeks = weeksFromSchemeJson(scheme.weeks)
      if (weekNumber != null) {
        const row = weeks.find((w) => w.week === weekNumber)
        if (row) {
          schemeId = scheme.id
          topicName = row.topic || topicName
          topicKey = topicKey || row.topicKey || null
          break
        }
      }
      if (plan.topicKey) {
        const byKey = weeks.find((w) => w.topicKey && w.topicKey === plan.topicKey)
        if (byKey) {
          schemeId = scheme.id
          weekNumber = byKey.week
          topicName = byKey.topic || topicName
          topicKey = byKey.topicKey || topicKey
          break
        }
      }
      const byTopic = weeks.find((w) => topicMatch(w.topic, plan.topic))
      if (byTopic) {
        schemeId = scheme.id
        weekNumber = byTopic.week
        topicName = byTopic.topic || topicName
        topicKey = topicKey || byTopic.topicKey || null
        break
      }
    }
  } else if (schemeId && weekNumber == null && plan.topicKey) {
    const scheme = await prisma.schemeOfWork.findUnique({
      where: { id: schemeId },
      select: { weeks: true },
    })
    if (scheme) {
      const weeks = weeksFromSchemeJson(scheme.weeks)
      const byKey = weeks.find((w) => w.topicKey && w.topicKey === plan.topicKey)
      if (byKey) {
        weekNumber = byKey.week
        topicName = byKey.topic || topicName
        topicKey = byKey.topicKey || topicKey
      }
    }
  }

  if (!schemeId || weekNumber == null || !Number.isFinite(weekNumber)) {
    return null
  }

  // Persist resolved link on the plan for later record-of-work exports
  if (!plan.schemeId || plan.weekNumber == null || (!plan.topicKey && topicKey)) {
    await prisma.lessonPlan.update({
      where: { id: plan.id },
      data: {
        schemeId,
        weekNumber,
        ...(topicKey && !plan.topicKey ? { topicKey } : {}),
      },
    })
  }

  const progress = await prisma.schemeProgress.upsert({
    where: {
      schemeId_weekNumber: { schemeId, weekNumber },
    },
    create: {
      schoolId: plan.schoolId,
      schemeId,
      teacherId: plan.createdByUserId,
      weekNumber,
      topicName,
      completed: Boolean(taught),
      completedAt: taught ? plan.approvedAt || new Date() : null,
      notes: taught
        ? `Auto from approved lesson plan ${plan.id}`
        : `Cleared — lesson plan not approved (${plan.id})`,
    },
    update: {
      completed: Boolean(taught),
      completedAt: taught ? plan.approvedAt || new Date() : null,
      topicName: topicName || undefined,
      notes: taught
        ? `Auto from approved lesson plan ${plan.id}`
        : `Cleared — lesson plan not approved (${plan.id})`,
    },
  })

  const scheme = await prisma.schemeOfWork.findUnique({
    where: { id: schemeId },
    select: { term: true, year: true, teacherId: true, schoolId: true },
  })
  if (scheme) {
    await recalculateTeacherPerformanceSummary({
      schoolId: scheme.schoolId,
      teacherId: scheme.teacherId,
      term: parseTermNumber(scheme.term),
      academicYear: scheme.year,
    })
  }

  return progress
}

/**
 * Load approved lesson plans for record-of-work / progress.
 */
export async function getApprovedLessonPlansForRecord({
  schoolId,
  teacherId,
  subject,
  grade,
  term,
  year,
}) {
  const termLabel =
    typeof term === 'number' ? `Term ${term}` : String(term || '').trim() || undefined

  const plans = await prisma.lessonPlan.findMany({
    where: {
      schoolId,
      createdByUserId: teacherId,
      status: 'APPROVED',
      subject: { equals: subject, mode: 'insensitive' },
      grade: { equals: String(grade), mode: 'insensitive' },
      ...(termLabel ? { term: { equals: termLabel, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ weekNumber: 'asc' }, { approvedAt: 'asc' }],
    select: {
      id: true,
      topic: true,
      subTopic: true,
      weekNumber: true,
      approvedAt: true,
      schemeId: true,
      topicKey: true,
      approvalNotes: true,
    },
  })

  // Prefer plans from the academic year via approvedAt when year provided
  if (year) {
    return plans.filter((p) => {
      if (!p.approvedAt) return true
      return p.approvedAt.getFullYear() === Number(year)
    })
  }
  return plans
}
