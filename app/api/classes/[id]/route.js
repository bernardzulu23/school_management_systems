import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const classItem = await prisma.class.findFirst({
      where: { id, schoolId },
    })

    if (!classItem) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: classItem })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const exists = await prisma.class.findFirst({ where: { id, schoolId }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    const name = data?.name !== undefined ? String(data.name).trim() : undefined
    if (name !== undefined && !name)
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })

    const capacity =
      data?.capacity !== undefined && data.capacity !== null && String(data.capacity).trim() !== ''
        ? Number.parseInt(String(data.capacity), 10)
        : undefined
    if (capacity !== undefined && (!Number.isFinite(capacity) || capacity < 0)) {
      return NextResponse.json({ error: 'Invalid capacity' }, { status: 400 })
    }

    const departmentId =
      data?.departmentId !== undefined
        ? data.departmentId
          ? String(data.departmentId).trim()
          : null
        : undefined

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, schoolId },
        select: { id: true },
      })
      if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 400 })
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(data?.level !== undefined ? { level: data.level } : {}),
        ...(data?.stream !== undefined ? { stream: data.stream } : {}),
        ...(data?.classTeacherId !== undefined ? { classTeacherId: data.classTeacherId } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updatedClass })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const deleted = await prisma.class.deleteMany({
      where: { id, schoolId },
    })
    if (deleted.count === 0) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    return NextResponse.json({ success: true, message: 'Class deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
  }
}
