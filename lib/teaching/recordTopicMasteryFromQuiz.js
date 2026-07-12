/**
 * Records class-level topic mastery after a quiz submission (best-effort).
 * Used by Teaching Studio analytics / reteach flags.
 */
import { prisma } from '@/lib/prisma'
import {
  parseTermNumber,
  recalculateTeacherPerformanceSummary,
  RETEACH_THRESHOLD,
} from '@/lib/teaching/performanceSummary'

export async function recordTopicMasteryFromQuiz({
  schoolId,
  teacherUserId,
  classId,
  topicName,
  score,
  studentCount = 1,
  term,
  academicYear,
}) {
  if (!schoolId || !teacherUserId || !classId || !topicName) return null
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0))
  const topic = String(topicName).trim().slice(0, 200)
  if (!topic) return null

  const existing = await prisma.topicMastery.findUnique({
    where: {
      schoolId_classId_topicName: { schoolId, classId, topicName: topic },
    },
  })

  const assessmentCount = (existing?.assessmentCount ?? 0) + 1
  const prevWeight = existing?.assessmentCount ?? 0
  const averageMasteryScore =
    prevWeight === 0
      ? safeScore
      : (existing.averageMasteryScore * prevWeight + safeScore) / assessmentCount

  const mastery = await prisma.topicMastery.upsert({
    where: {
      schoolId_classId_topicName: { schoolId, classId, topicName: topic },
    },
    create: {
      schoolId,
      teacherId: teacherUserId,
      classId,
      topicName: topic,
      averageMasteryScore,
      studentCount,
      assessmentCount: 1,
      needsReteaching: averageMasteryScore < RETEACH_THRESHOLD,
      lastAssessedAt: new Date(),
    },
    update: {
      teacherId: teacherUserId,
      averageMasteryScore,
      studentCount: Math.max(studentCount, existing?.studentCount ?? 0),
      assessmentCount,
      needsReteaching: averageMasteryScore < RETEACH_THRESHOLD,
      lastAssessedAt: new Date(),
    },
  })

  const year = academicYear || new Date().getFullYear()
  const termNum =
    term != null
      ? parseTermNumber(term)
      : new Date().getMonth() < 5
        ? 1
        : new Date().getMonth() < 9
          ? 2
          : 3

  await recalculateTeacherPerformanceSummary({
    schoolId,
    teacherId: teacherUserId,
    term: termNum,
    academicYear: year,
  })

  if (mastery.needsReteaching) {
    const { notifyLowMasteryFromTopicMastery } = await import('@/lib/notifications/integrations')
    await notifyLowMasteryFromTopicMastery(mastery)
  }

  return mastery
}
