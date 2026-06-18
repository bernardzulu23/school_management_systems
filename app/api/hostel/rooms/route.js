export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'hostel')
  if (typeBlock) return typeBlock

  const db = getTenantClient(schoolId)

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year')) || new Date().getFullYear()

  const rooms = await db.hostelRoom.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    include: {
      students: {
        where: { year },
        include: {
          student: { select: { id: true, name: true, class: true, exam_number: true } },
        },
      },
      _count: { select: { students: true } },
    },
  })

  return NextResponse.json({
    success: true,
    year,
    data: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      gender: room.gender,
      boardedCount: room.students.length,
      students: room.students.map((s) => ({
        assignmentId: s.id,
        studentId: s.studentId,
        name: s.student?.name,
        class: s.student?.class,
        examNumber: s.student?.exam_number,
        year: s.year,
      })),
    })),
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'hostel')
  if (typeBlock) return typeBlock

  const db = getTenantClient(schoolId)

  const body = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  const gender = String(body?.gender || 'mixed')
    .trim()
    .toLowerCase()
  const capacity = Number(body?.capacity)
  if (!name) throw new ApiError('Room name is required', 400)
  if (!Number.isFinite(capacity) || capacity < 1) throw new ApiError('Capacity is required', 400)

  const room = await db.hostelRoom.create({
    data: { schoolId, name, capacity, gender },
  })

  return NextResponse.json({ success: true, data: room }, { status: 201 })
})
