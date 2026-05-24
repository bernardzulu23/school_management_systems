export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

export async function PUT(req, { params }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin', 'hod'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const routeParams = await params
  const teacherKey = String(routeParams?.teacherId || '').trim()
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
}
