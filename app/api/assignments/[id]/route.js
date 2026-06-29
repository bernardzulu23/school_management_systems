export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam, safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  assertTeacherManagesAssignment,
  assertTeacherTeachesClassSubject,
} from '@/lib/assignments/routeScope'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) throw new ApiError('Invalid id', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, schoolId },
  })

  if (!assignment) throw new ApiError('Not found', 404)

  if (roleCheck(auth.user, ['STUDENT', 'student'])) {
    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { classId: true, class: true, selected_subjects: true },
    })
    if (!student) throw new ApiError('Student profile not found', 404)
    if (student.classId) {
      if (String(assignment.classId || '') !== String(student.classId))
        throw new ApiError('Forbidden', 403)
    } else if (assignment.class !== student.class) {
      throw new ApiError('Forbidden', 403)
    }
    if (!(student.selected_subjects || []).includes(assignment.subject)) {
      throw new ApiError('Forbidden', 403)
    }
  } else {
    await assertTeacherManagesAssignment({ schoolId, user: auth.user, assignment })
  }

  return NextResponse.json({ success: true, data: assignment })
})

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) throw new ApiError('Invalid id', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const existing = await prisma.assignment.findFirst({
    where: { id: assignmentId, schoolId },
  })
  if (!existing) throw new ApiError('Not found', 404)
  await assertTeacherManagesAssignment({ schoolId, user: auth.user, assignment: existing })

  const body = await request.json()
  const classId = safeStringId(body?.classId) || ''
  const className = safeQueryString(body?.class, { maxLength: 256, defaultValue: '' })

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

  if ((classId || className) && !classRecord) {
    throw new ApiError('Class not found in this school', 404)
  }

  const nextSubject = body.subject ? String(body.subject).trim() : existing.subject
  const nextClassId = classRecord?.id || existing.classId
  if (classRecord || body.subject) {
    await assertTeacherTeachesClassSubject({
      schoolId,
      user: auth.user,
      classId: nextClassId,
      subjectName: nextSubject,
    })
  }

  const updated = await prisma.assignment.updateMany({
    where: { id: assignmentId, schoolId },
    data: {
      title: body.title ? String(body.title).trim() : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      subject: body.subject ? String(body.subject).trim() : undefined,
      ...(classId || className
        ? { classId: classRecord?.id || null, class: classRecord?.name || className }
        : {}),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
  })

  if (updated.count === 0) throw new ApiError('Not found', 404)

  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId } })
  return NextResponse.json({ success: true, data: assignment })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) throw new ApiError('Invalid id', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const existing = await prisma.assignment.findFirst({
    where: { id: assignmentId, schoolId },
  })
  if (!existing) throw new ApiError('Not found', 404)
  await assertTeacherManagesAssignment({ schoolId, user: auth.user, assignment: existing })

  await prisma.assignment.deleteMany({
    where: { id: assignmentId, schoolId },
  })

  return NextResponse.json({ success: true })
})
