export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { formatTeachingAssignmentDtos, resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const teacherId = safeQueryString(searchParams.get('teacherId'))

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ success: true, data: [] })
  }

  let resolvedTeacherId = teacherId
  if (!resolvedTeacherId && roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true },
    })
    resolvedTeacherId = teacher?.id || null
  }

  if (!resolvedTeacherId) {
    return NextResponse.json({ error: 'teacherId is required', data: [] }, { status: 400 })
  }

  if (
    !roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'TEACHER', 'teacher', 'hod']) &&
    !(roleCheck(auth.user, ['TEACHER', 'teacher']) && auth.user.id)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: resolvedTeacherId, schoolId },
    include: {
      user: { select: { id: true, name: true } },
      classes: true,
      subjects: true,
      teachingAssignments: {
        where: { schoolId },
        include: { class: true, subject: true },
      },
    },
  })

  if (!teacher) {
    return NextResponse.json({ success: true, data: [] })
  }

  const { assignments } = await resolveTeacherLoad({ schoolId, teacher })

  return NextResponse.json({
    success: true,
    data: formatTeachingAssignmentDtos(assignments, teacher.user?.name),
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()
  const teacherId = safeStringId(body.teacherId)
  const classId = safeStringId(body.classId)
  const subjectId = safeStringId(body.subjectId)
  const className = body.className
  const subjectName = body.subjectName

  if (!teacherId) return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })

  const [teacher, resolvedClass, resolvedSubject] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true },
    }),
    classId
      ? prisma.class.findFirst({
          where: { id: classId, schoolId },
          select: { id: true },
        })
      : className
        ? prisma.class.upsert({
            where: { schoolId_name: { schoolId, name: String(className).trim() } },
            create: {
              schoolId,
              name: String(className).trim(),
              year_group: String(body.year_group || '').trim() || String(className).trim(),
              section: String(body.section || '').trim() || '',
            },
            update: {},
            select: { id: true },
          })
        : Promise.resolve(null),
    subjectId
      ? prisma.subject.findFirst({
          where: { id: subjectId, schoolId },
          select: { id: true },
        })
      : subjectName
        ? prisma.subject.upsert({
            where: { schoolId_name: { schoolId, name: String(subjectName).trim() } },
            create: {
              schoolId,
              name: String(subjectName).trim(),
              topics: [],
            },
            update: {},
            select: { id: true },
          })
        : Promise.resolve(null),
  ])

  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  if (!resolvedClass)
    return NextResponse.json({ error: 'classId or className required' }, { status: 400 })
  if (!resolvedSubject)
    return NextResponse.json({ error: 'subjectId or subjectName required' }, { status: 400 })

  const assignment = await prisma.teachingAssignment.upsert({
    where: {
      schoolId_teacherId_subjectId_classId: {
        schoolId,
        teacherId: teacher.id,
        subjectId: resolvedSubject.id,
        classId: resolvedClass.id,
      },
    },
    create: {
      schoolId,
      teacherId: teacher.id,
      subjectId: resolvedSubject.id,
      classId: resolvedClass.id,
    },
    update: {},
    include: {
      class: true,
      subject: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: assignment.id,
      teacherId: assignment.teacherId,
      classId: assignment.classId,
      className: assignment.class?.name || null,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject?.name || null,
    },
  })
})
