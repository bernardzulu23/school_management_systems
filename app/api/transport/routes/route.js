export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

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
  const db = getTenantClient(schoolId)

  const routes = await db.busRoute.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    include: {
      students: {
        include: {
          student: { select: { id: true, name: true, class: true, exam_number: true } },
        },
      },
      _count: { select: { students: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data: routes.map((r) => ({
      id: r.id,
      name: r.name,
      driver: r.driver,
      capacity: r.capacity,
      studentCount: r._count.students,
      students: r.students.map((s) => ({
        assignmentId: s.id,
        studentId: s.studentId,
        name: s.student?.name,
        class: s.student?.class,
        examNumber: s.student?.exam_number,
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
  const db = getTenantClient(schoolId)

  const body = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  if (!name) throw new ApiError('Route name is required', 400)

  const route = await db.busRoute.create({
    data: {
      schoolId,
      name,
      driver: body?.driver ? String(body.driver).trim() : null,
      capacity: Number.isFinite(Number(body?.capacity)) ? Number(body.capacity) : null,
    },
  })

  return NextResponse.json({ success: true, data: route }, { status: 201 })
})
