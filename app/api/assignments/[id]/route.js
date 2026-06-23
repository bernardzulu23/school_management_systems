import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam, safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'

export async function GET(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, schoolId },
  })

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (roleCheck(auth.user, ['STUDENT', 'student'])) {
    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { classId: true, class: true, selected_subjects: true },
    })
    if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    if (student.classId) {
      if (String(assignment.classId || '') !== String(student.classId))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else if (assignment.class !== student.class) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!(student.selected_subjects || []).includes(assignment.subject)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json({ success: true, data: assignment })
}

export async function PUT(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

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

  if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId } })
  return NextResponse.json({ success: true, data: assignment })
}

export async function DELETE(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const deleted = await prisma.assignment.deleteMany({
    where: { id: assignmentId, schoolId },
  })

  if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
