import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { deleteUserCascade } from '@/lib/db/deleteCascade'

export async function GET(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findFirst({
    where: { id: params.id, schoolId },
    include: { studentProfile: true, teacherProfile: true, hodProfile: true },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: user })
}

export async function PUT(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const existing = await prisma.user.findFirst({
    where: { id: params.id, schoolId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['name', 'email', 'contact_number', 'address', 'gender', 'profile_picture_url']
  const data = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data,
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findFirst({
    where: { id: params.id, schoolId },
    include: { studentProfile: true, teacherProfile: true, hodProfile: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await deleteUserCascade({ tx, schoolId, userId: user.id })
  })

  return NextResponse.json({ success: true })
}
