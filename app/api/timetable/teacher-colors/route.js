export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import {
  loadTeacherColorMap,
  PREDEFINED_TEACHER_COLORS,
  teacherColorMapToJson,
} from '@/lib/timetable/teacherColors'

export async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const colorMap = await loadTeacherColorMap(prisma, schoolId)
  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: 'asc' } },
  })

  const data = teachers.map((t, idx) => {
    const userId = String(t.userId)
    const existing = colorMap.get(userId)
    const fallback = PREDEFINED_TEACHER_COLORS[idx % PREDEFINED_TEACHER_COLORS.length]
    return {
      teacherId: t.id,
      teacherUserId: userId,
      teacherName: t.user?.name || 'Teacher',
      colorHex: existing?.colorHex || fallback.hex,
      colorName: existing?.colorName || fallback.name,
      fromDatabase: Boolean(existing),
    }
  })

  return NextResponse.json({
    colors: data,
    map: teacherColorMapToJson(colorMap),
    palette: PREDEFINED_TEACHER_COLORS,
  })
}

export async function POST(req) {
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

  if (!autoAssign) {
    return NextResponse.json(
      { error: 'Use PUT /api/timetable/teacher-colors/[teacherId]' },
      { status: 400 }
    )
  }

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  let count = 0
  for (let i = 0; i < teachers.length; i++) {
    const preset = PREDEFINED_TEACHER_COLORS[i % PREDEFINED_TEACHER_COLORS.length]
    const existing = await prisma.teacherColor.findUnique({
      where: { schoolId_teacherId: { schoolId, teacherId: teachers[i].id } },
    })
    if (existing) continue
    await prisma.teacherColor.create({
      data: {
        schoolId,
        teacherId: teachers[i].id,
        colorHex: preset.hex,
        colorName: preset.name,
      },
    })
    count += 1
  }

  return NextResponse.json({ success: true, assigned: count })
}
