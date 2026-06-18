export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

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
  const studentId = String(body?.studentId || '').trim()
  const routeId = String(body?.routeId || '').trim()
  if (!studentId || !routeId) throw new ApiError('studentId and routeId are required', 400)

  const [student, route] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } }),
    db.busRoute.findFirst({ where: { id: routeId, schoolId }, select: { id: true } }),
  ])
  if (!student) throw new ApiError('Student not found', 404)
  if (!route) throw new ApiError('Route not found', 404)

  const assignment = await db.studentBusRoute.upsert({
    where: { studentId },
    create: { studentId, routeId, schoolId },
    update: { routeId },
    include: {
      student: { select: { id: true, name: true, class: true } },
      route: { select: { id: true, name: true } },
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
  const db = getTenantClient(schoolId)

  const { searchParams } = new URL(request.url)
  const studentId = String(searchParams.get('studentId') || '').trim()
  if (!studentId) throw new ApiError('studentId is required', 400)

  await db.studentBusRoute.deleteMany({ where: { schoolId, studentId } })
  return NextResponse.json({ success: true })
})
