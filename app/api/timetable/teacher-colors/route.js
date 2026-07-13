export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { loadTeacherColorMap, teacherColorMapToJson } from '@/lib/timetable/teacherColors'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { assignUniqueColorsForSchool, ensureTeacherColor } from '@/lib/timetable/assignTeacherColor'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

const TEACHER_COLOR_LIMIT = 500

export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  // Ensure every teacher has a persisted unique colour (idempotent).
  await assignUniqueColorsForSchool(prisma, schoolId, { force: false })

  const colorMap = await loadTeacherColorMap(prisma, schoolId)
  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'asc' }, { user: { name: 'asc' } }],
    take: TEACHER_COLOR_LIMIT,
  })

  const data = teachers.map((t) => {
    const userId = String(t.userId)
    const existing = colorMap.get(userId)
    return {
      teacherId: t.id,
      teacherUserId: userId,
      teacherName: t.user?.name || 'Teacher',
      colorHex: existing?.colorHex || null,
      colorName: existing?.colorName || null,
      fromDatabase: Boolean(existing),
    }
  })

  return NextResponse.json({
    colors: data,
    map: teacherColorMapToJson(colorMap),
    unique: true,
  })
})

export const POST = withErrorHandler(async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin', 'hod'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const autoAssign = body?.autoAssign === true
  const forceReassign = body?.force === true
  const teacherId = body?.teacherId ? String(body.teacherId) : null

  if (teacherId) {
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, OR: [{ id: teacherId }, { userId: teacherId }] },
      select: { id: true },
    })
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    const result = await ensureTeacherColor(prisma, {
      schoolId,
      teacherId: teacher.id,
      force: forceReassign,
    })
    return NextResponse.json({ success: true, ...result })
  }

  if (!autoAssign) {
    return NextResponse.json(
      { error: 'Use PUT /api/timetable/teacher-colors/[teacherId] or { autoAssign: true }' },
      { status: 400 }
    )
  }

  const result = await assignUniqueColorsForSchool(prisma, schoolId, { force: forceReassign })
  const colorMap = await loadTeacherColorMap(prisma, schoolId)

  return NextResponse.json({
    success: true,
    assigned: result.assigned,
    skipped: result.skipped,
    total: result.total,
    distinct: true,
    map: teacherColorMapToJson(colorMap),
  })
})
