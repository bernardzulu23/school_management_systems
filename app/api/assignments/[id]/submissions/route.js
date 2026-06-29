export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import {
  gradeQuizAttempt,
  parseInteractiveQuizPayload,
  sanitizeQuizForStudent,
} from '@/lib/assessments/interactiveQuiz'
import { maybeNotifyTeacherOfAttempts } from '@/lib/assessments/review'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { assertTeacherManagesAssignment } from '@/lib/assignments/routeScope'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

function parseSubmissionContent(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function resolveContext(request, assignmentId) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { error: auth.response }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { error: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId)
    return { error: NextResponse.json({ error: 'School context required' }, { status: 400 }) }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, schoolId },
    include: {
      assessment: { select: { id: true, status: true } },
    },
  })
  if (!assignment)
    return { error: NextResponse.json({ error: 'Assignment not found' }, { status: 404 }) }

  if (
    assignment.assessmentId &&
    assignment.assessment &&
    String(assignment.assessment.status) !== 'PUBLISHED'
  ) {
    return {
      error: NextResponse.json(
        { error: 'This assessment is not yet available for students' },
        { status: 403 }
      ),
    }
  }

  const payload = parseInteractiveQuizPayload(assignment.description)
  if (!payload?.quiz) {
    return {
      error: NextResponse.json({ error: 'Interactive quiz payload missing' }, { status: 400 }),
    }
  }

  return { auth, schoolId, assignment, payload }
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const ctx = await resolveContext(request, assignmentId)
  if (ctx.error) return ctx.error
  const { auth, schoolId, assignment, payload } = ctx

  if (roleCheck(auth.user, ['STUDENT', 'student'])) {
    const student = await prisma.student.findFirst({
      where: { schoolId, userId: auth.user.id },
      select: { id: true, classId: true, class: true, selected_subjects: true },
    })
    if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })

    const classAllowed = student.classId
      ? String(student.classId) === String(assignment.classId || '')
      : String(student.class || '') === String(assignment.class || '')
    const subjectAllowed = Array.isArray(student.selected_subjects)
      ? student.selected_subjects.includes(assignment.subject)
      : true
    if (!classAllowed || !subjectAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const submission = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: assignment.id, studentId: student.id, schoolId },
    })
    const submissionContent = parseSubmissionContent(submission?.content)
    const hasSubmitted = submission?.status === 'submitted'
    const quizForStudent = hasSubmitted ? payload.quiz : sanitizeQuizForStudent(payload.quiz)

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          subject: assignment.subject,
          dueDate: assignment.dueDate,
          class: assignment.class,
        },
        quiz: quizForStudent,
        submission: submission
          ? {
              id: submission.id,
              status: submission.status,
              submittedAt: submission.submittedAt,
              grade: submission.grade,
              answers: submissionContent?.answers || {},
              review: hasSubmitted ? submissionContent?.review || [] : [],
              encouragement: hasSubmitted ? submissionContent?.encouragement || '' : '',
              needsReview: Boolean(submissionContent?.needsReview),
            }
          : null,
      },
    })
  }

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await assertTeacherManagesAssignment({ schoolId, user: auth.user, assignment })

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: assignment.id, schoolId },
    include: {
      student: { select: { id: true, name: true, class: true, exam_number: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })

  const graded = submissions.filter((s) => Number.isFinite(Number(s.grade)))
  const averagePercentage =
    graded.length > 0
      ? Math.round(graded.reduce((sum, s) => sum + Number(s.grade || 0), 0) / graded.length)
      : 0

  return NextResponse.json({
    success: true,
    data: {
      assignmentId: assignment.id,
      title: assignment.title,
      totalSubmissions: submissions.length,
      averagePercentage,
      submissions: submissions.map((s) => {
        const content = parseSubmissionContent(s.content)
        return {
          id: s.id,
          student: s.student,
          grade: s.grade,
          feedback: s.feedback,
          status: s.status,
          submittedAt: s.submittedAt,
          score: content?.score ?? null,
          totalMarks: content?.totalMarks ?? null,
          encouragement: content?.encouragement ?? '',
        }
      }),
    },
  })
})

export const POST = withErrorHandler(async function POST(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const ctx = await resolveContext(request, assignmentId)
  if (ctx.error) return ctx.error
  const { auth, schoolId, assignment, payload } = ctx

  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    return NextResponse.json({ error: 'Only students can submit attempts' }, { status: 403 })
  }

  const student = await prisma.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true, classId: true, class: true, selected_subjects: true },
  })
  if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })

  const classAllowed = student.classId
    ? String(student.classId) === String(assignment.classId || '')
    : String(student.class || '') === String(assignment.class || '')
  const subjectAllowed = Array.isArray(student.selected_subjects)
    ? student.selected_subjects.includes(assignment.subject)
    : true
  if (!classAllowed || !subjectAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {}
  const submit = body?.submit !== false

  const grading = gradeQuizAttempt(payload.quiz, answers)
  const status = submit ? 'submitted' : 'draft'
  const content = JSON.stringify({
    answers,
    review: grading.review,
    score: grading.score,
    totalMarks: grading.totalMarks,
    percentage: grading.percentage,
    encouragement: grading.encouragement,
    needsReview: grading.needsReview,
  })

  const saved = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    update: {
      content,
      grade: grading.percentage,
      status,
      feedback: grading.encouragement,
      submittedAt: new Date(),
    },
    create: {
      assignmentId: assignment.id,
      studentId: student.id,
      schoolId,
      content,
      grade: grading.percentage,
      status,
      feedback: grading.encouragement,
    },
  })

  if (submit) {
    await maybeNotifyTeacherOfAttempts({
      assignment,
      schoolId,
      studentId: auth.user.id,
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      submissionId: saved.id,
      status: saved.status,
      score: grading.score,
      totalMarks: grading.totalMarks,
      percentage: grading.percentage,
      encouragement: grading.encouragement,
      needsReview: grading.needsReview,
      review: submit ? grading.review : [],
    },
  })
})
