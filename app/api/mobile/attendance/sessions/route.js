export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { openAttendanceSession } from '@/lib/attendance/sessions'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const classId = String(body.classId || '').trim()
  const subjectId = String(body.subjectId || '').trim()
  if (!classId || !subjectId) {
    return NextResponse.json({ error: 'classId and subjectId are required' }, { status: 400 })
  }

  const session = await openAttendanceSession({
    schoolId,
    teacherUserId: auth.user.id,
    classId,
    subjectId,
    periodLabel: body.periodLabel || null,
    term: body.term,
    academicYear: body.academicYear || null,
    shift: body.shift || 'SINGLE',
    verificationMethod: body.verificationMethod || 'MANUAL',
    lateAfterMinutes: body.lateAfterMinutes,
  })

  return NextResponse.json({ success: true, data: session })
})

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'OPEN'

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      schoolId,
      teacherId: auth.user.id,
      ...(status ? { status: status.toUpperCase() } : {}),
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      marks: {
        select: {
          studentId: true,
          status: true,
          method: true,
          markedAt: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ success: true, data: sessions })
})
