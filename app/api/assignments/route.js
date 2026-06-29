export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseInteractiveQuizPayload } from '@/lib/assessments/interactiveQuiz'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  assertTeacherTeachesClassSubject,
  buildTeacherAssignmentWhere,
  assertTeacherManagesAssignment,
} from '@/lib/assignments/routeScope'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const className = safeQueryString(searchParams.get('class'))
  const classId = safeStringId(searchParams.get('classId'))
  const subject = safeQueryString(searchParams.get('subject'))

  if (roleCheck(auth.user, ['STUDENT', 'student'])) {
    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { classId: true, class: true, selected_subjects: true },
    })
    if (!student) throw new ApiError('Student profile not found', 404)

    const where = {
      schoolId,
      ...(student.classId ? { classId: student.classId } : { class: student.class }),
      ...(subject ? { subject } : { subject: { in: student.selected_subjects || [] } }),
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ success: true, data: assignments })
  }

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const baseWhere = await buildTeacherAssignmentWhere(schoolId, auth.user)
  const where = {
    ...baseWhere,
    ...(classId ? { classId } : className ? { class: className } : {}),
    ...(subject ? { subject } : {}),
  }

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { dueDate: 'desc' },
  })

  return NextResponse.json({ success: true, data: assignments })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json()
  const title = String(body.title || '').trim()
  const subject = String(body.subject || '').trim()
  const classId = safeStringId(body.classId)
  const className = String(body.class || '').trim()
  const dueDate = body.dueDate ? new Date(body.dueDate) : null

  if (
    !title ||
    !subject ||
    (!classId && !className) ||
    !dueDate ||
    Number.isNaN(dueDate.getTime())
  ) {
    throw new ApiError('title, subject, class, dueDate are required', 400)
  }

  const classRecord = classId
    ? await prisma.class.findFirst({
        where: { schoolId, id: classId },
        select: { id: true, name: true },
      })
    : className
      ? await prisma.class.findFirst({
          where: { schoolId, name: { equals: className, mode: 'insensitive' } },
          select: { id: true, name: true },
        })
      : null

  if (!classRecord) throw new ApiError('Class not found in this school', 404)

  await assertTeacherTeachesClassSubject({
    schoolId,
    user: auth.user,
    classId: classRecord.id,
    subjectName: subject,
  })

  const teacher = roleCheck(auth.user, ['TEACHER', 'teacher'])
    ? await prisma.teacher.findFirst({
        where: { userId: auth.user.id, schoolId },
        select: { id: true },
      })
    : null

  const description = body.description ? String(body.description) : null
  const isInteractiveQuiz = Boolean(parseInteractiveQuizPayload(description))
  const assessmentId = safeStringId(body.assessmentId)

  if (isInteractiveQuiz && !assessmentId) {
    throw new ApiError(
      'Interactive quizzes must be created as an assessment and approved by HOD before publishing.',
      400
    )
  }

  if (assessmentId) {
    const linked = await prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: { id: true, status: true },
    })
    if (!linked || !['APPROVED', 'PUBLISHED'].includes(String(linked.status))) {
      throw new ApiError(
        'Linked assessment must be HOD-approved before publishing to students',
        400
      )
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      subject,
      classId: classRecord.id,
      class: classRecord.name,
      dueDate,
      schoolId,
      teacherId: teacher?.id || null,
      assessmentId: assessmentId || null,
    },
  })

  if (assessmentId) {
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'PUBLISHED', publishedAssignmentId: assignment.id },
    })
  }

  return NextResponse.json({ success: true, data: assignment }, { status: 201 })
})
