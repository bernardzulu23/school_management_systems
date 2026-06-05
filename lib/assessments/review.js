import prisma from '@/lib/prisma'
import { resolveReviewerUserId } from '@/lib/lesson-plans/reviewer'
import {
  parseAssessmentInteractive,
  publishAssessmentAsAssignment,
} from '@/lib/assessments/assessmentInteractive'

export const ASSESSMENT_SUBMITTABLE = new Set(['DRAFT', 'REJECTED', 'REVISION_REQUESTED'])
export const ASSESSMENT_EDITABLE = new Set(['DRAFT', 'REJECTED', 'REVISION_REQUESTED'])

export function normalizeAssessmentStatus(status) {
  return String(status || 'DRAFT').toUpperCase()
}

export async function resolveAssessmentReviewer({ schoolId, teacherUserId, assessment }) {
  return resolveReviewerUserId({
    schoolId,
    teacherUserId,
    grade: assessment.class,
    subject: assessment.subject,
  })
}

export async function approveAndPublishAssessment({
  assessment,
  schoolId,
  reviewerUserId,
  approvalNotes,
}) {
  const interactive = parseAssessmentInteractive(assessment.description)
  const questions = interactive?.questions || []
  if (!questions.length) {
    const err = new Error('Assessment has no questions to publish')
    err.status = 400
    throw err
  }

  const teacher = assessment.createdByUserId
    ? await prisma.teacher.findFirst({
        where: { schoolId, userId: assessment.createdByUserId },
        select: { id: true },
      })
    : null

  const now = new Date()
  const { assignment } = await publishAssessmentAsAssignment({
    prisma,
    schoolId,
    assessment: {
      ...assessment,
      title: assessment.title,
      subject: assessment.subject,
      class: assessment.class,
      classId: assessment.classId,
      date: assessment.date,
      id: assessment.id,
      topic: assessment.topic,
    },
    questions,
    classId: assessment.classId,
    className: assessment.class,
    dueDate: assessment.date,
    teacherId: teacher?.id || null,
  })

  const updated = await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: 'PUBLISHED',
      approvedAt: now,
      approvalNotes: approvalNotes || null,
      rejectedAt: null,
      rejectionReason: null,
      publishedAssignmentId: assignment.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  return { assessment: updated, assignment }
}

export async function notifyAssessmentReview({
  schoolId,
  fromUserId,
  toUserId,
  assessment,
  title,
  message,
  status,
}) {
  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId,
      toUserId,
      type: 'assessment_review',
      title,
      message,
      meta: {
        assessmentId: assessment.id,
        status,
        subject: assessment.subject,
        class: assessment.class,
        rejectionReason: assessment.rejectionReason || null,
        approvalNotes: assessment.approvalNotes || null,
        publishedAssignmentId: assessment.publishedAssignmentId || null,
      },
    },
  })
}

export async function maybeNotifyTeacherOfAttempts({ assignment, schoolId, studentId }) {
  if (!assignment?.assessmentId || !assignment?.teacherId) return

  const [classStudents, submissions, assessment] = await Promise.all([
    assignment.classId
      ? prisma.student.count({ where: { schoolId, classId: assignment.classId } })
      : prisma.student.count({ where: { schoolId, class: assignment.class } }),
    prisma.assignmentSubmission.count({
      where: { assignmentId: assignment.id, schoolId, status: 'submitted' },
    }),
    prisma.assessment.findFirst({
      where: { id: assignment.assessmentId, schoolId },
      select: { id: true, title: true, createdByUserId: true },
    }),
  ])

  if (!assessment?.createdByUserId) return

  const threshold = Math.max(1, Math.ceil(classStudents * 0.5))
  const duePassed = assignment.dueDate && new Date(assignment.dueDate) <= new Date()
  if (submissions < threshold && !duePassed) return

  const recent = await prisma.timetableNotification.findMany({
    where: {
      schoolId,
      toUserId: assessment.createdByUserId,
      type: 'assessment_attempts',
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { meta: true },
  })
  if (recent.some((n) => n.meta?.assessmentId === assessment.id)) return

  const graded = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: assignment.id, schoolId, status: 'submitted' },
    select: { grade: true },
  })
  const valid = graded.filter((s) => Number.isFinite(Number(s.grade)))
  const average =
    valid.length > 0
      ? Math.round(valid.reduce((sum, s) => sum + Number(s.grade), 0) / valid.length)
      : 0

  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId: studentId || assessment.createdByUserId,
      toUserId: assessment.createdByUserId,
      type: 'assessment_attempts',
      title: 'Quiz attempts summary',
      message: `${assessment.title}: ${submissions} student(s) attempted. Class average ${average}%.`,
      meta: {
        assessmentId: assessment.id,
        assignmentId: assignment.id,
        submissions,
        averagePercentage: average,
      },
    },
  })
}
