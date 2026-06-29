export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const classItem = await prisma.class.findFirst({
    where: { id, schoolId },
  })

  if (!classItem) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: classItem })
})

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const data = await request.json().catch(() => ({}))

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
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
        ? safeStringId(data.departmentId)
        : null
      : undefined

  if (data?.departmentId && departmentId === null && data.departmentId) {
    return NextResponse.json({ error: 'Invalid departmentId' }, { status: 400 })
  }

  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, schoolId },
      select: { id: true },
    })
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 400 })
  }

  const classTeacherId =
    data?.classTeacherId !== undefined
      ? data.classTeacherId
        ? safeStringId(data.classTeacherId)
        : null
      : undefined

  const updatedClass = await prisma.class.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(data?.level !== undefined ? { level: data.level } : {}),
      ...(data?.stream !== undefined ? { stream: data.stream } : {}),
      ...(classTeacherId !== undefined ? { classTeacherId } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updatedClass })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const deleted = await prisma.class.deleteMany({
    where: { id, schoolId },
  })
  if (deleted.count === 0) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  return NextResponse.json({ success: true, message: 'Class deleted successfully' })
})
