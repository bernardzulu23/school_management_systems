export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import { checkHostelGenderMatch } from '@/lib/hostel/genderMatch'

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
  const studentId = String(body?.studentId || '').trim()
  const roomId = String(body?.roomId || '').trim()
  const year = Number(body?.year) || new Date().getFullYear()
  if (!studentId || !roomId) throw new ApiError('studentId and roomId are required', 400)

  const [student, room] = await Promise.all([
    db.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, user: { select: { gender: true } } },
    }),
    db.hostelRoom.findFirst({
      where: { id: roomId, schoolId },
      select: { id: true, capacity: true, gender: true },
    }),
  ])
  if (!student) throw new ApiError('Student not found', 404)
  if (!room) throw new ApiError('Room not found', 404)

  const genderCheck = checkHostelGenderMatch({
    studentGender: student.user?.gender,
    roomGender: room.gender,
  })
  if (!genderCheck.ok) {
    const err = new ApiError(genderCheck.message, 400)
    err.code = genderCheck.code
    throw err
  }

  const currentCount = await db.studentHostel.count({ where: { roomId, year } })
  if (currentCount >= room.capacity) {
    throw new ApiError('Room is at capacity', 400)
  }

  const assignment = await db.studentHostel.upsert({
    where: { studentId_year: { studentId, year } },
    create: { studentId, roomId, schoolId, year },
    update: { roomId },
    include: {
      student: { select: { id: true, name: true, class: true } },
      room: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: assignment })
})

export const DELETE = withErrorHandler(async function DELETE(request) {
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

  const { searchParams } = new URL(request.url)
  const studentId = String(searchParams.get('studentId') || '').trim()
  const year = Number(searchParams.get('year')) || new Date().getFullYear()
  if (!studentId) throw new ApiError('studentId is required', 400)

  await db.studentHostel.deleteMany({ where: { schoolId, studentId, year } })
  return NextResponse.json({ success: true })
})
