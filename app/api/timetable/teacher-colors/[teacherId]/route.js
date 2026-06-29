export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { authMiddleware } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PUT = withErrorHandler(async function PUT(req, { params }) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(req, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const role = String(auth.user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin', 'hod'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const teacherKey = await safeRouteParam(params, 'teacherId')
  if (!teacherKey) return NextResponse.json({ error: 'teacherId required' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const colorHex = String(body?.colorHex || '').trim()
  const colorName = body?.colorName ? String(body.colorName).trim() : null
  if (!colorHex) return NextResponse.json({ error: 'colorHex required' }, { status: 400 })

  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId,
      OR: [{ id: teacherKey }, { userId: teacherKey }],
    },
    select: { id: true, userId: true },
  })
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

  const color = await prisma.teacherColor.upsert({
    where: { schoolId_teacherId: { schoolId, teacherId: teacher.id } },
    create: { schoolId, teacherId: teacher.id, colorHex, colorName },
    update: { colorHex, colorName },
  })

  return NextResponse.json({
    ...color,
    teacherUserId: teacher.userId,
  })
})
