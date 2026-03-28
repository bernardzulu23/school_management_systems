import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hod = await prisma.headOfDepartment.findFirst({
    where: { id: params.id, schoolId },
    include: { user: true, departmentRef: true },
  })

  if (!hod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: hod })
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

  const existing = await prisma.headOfDepartment.findFirst({
    where: { id: params.id, schoolId },
    select: { id: true, userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    if (body.user && existing.userId) {
      const userUpdates = {}
      if (body.user.name !== undefined) userUpdates.name = String(body.user.name)
      if (body.user.email !== undefined) userUpdates.email = String(body.user.email)
      if (body.user.contact_number !== undefined) {
        userUpdates.contact_number = String(body.user.contact_number)
      }
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdates,
        })
      }
    }

    const hodUpdates = {}
    if (body.department !== undefined) hodUpdates.department = String(body.department)
    if (body.departmentId !== undefined)
      hodUpdates.departmentId = body.departmentId ? String(body.departmentId) : null

    await tx.headOfDepartment.update({
      where: { id: existing.id },
      data: hodUpdates,
    })

    return tx.headOfDepartment.findFirst({
      where: { id: existing.id, schoolId },
      include: { user: true, departmentRef: true },
    })
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

  const existing = await prisma.headOfDepartment.findFirst({
    where: { id: params.id, schoolId },
    select: { id: true, userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.headOfDepartment.delete({ where: { id: existing.id } })
    await tx.user.delete({ where: { id: existing.userId } })
  })

  return NextResponse.json({ success: true })
}
