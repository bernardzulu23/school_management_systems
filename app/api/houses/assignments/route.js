export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { assignStudentToHouse, removeMembership } from '@/lib/houses'

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

  const planGate = await requireFeature(schoolId, 'inter-house')
  if (planGate instanceof NextResponse) return planGate

  const body = await request.json().catch(() => ({}))
  const studentId = String(body?.studentId || '').trim()
  const houseId = String(body?.houseId || '').trim()
  const year = Number(body?.year) || new Date().getFullYear()
  if (!studentId || !houseId) throw new ApiError('studentId and houseId are required', 400)

  const assignment = await assignStudentToHouse(schoolId, { studentId, houseId, year })
  if (!assignment) throw new ApiError('Student or house not found', 404)

  return NextResponse.json({ success: true, data: assignment }, { status: 201 })
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

  const planGate = await requireFeature(schoolId, 'inter-house')
  if (planGate instanceof NextResponse) return planGate

  const { searchParams } = new URL(request.url)
  const studentId = String(searchParams.get('studentId') || '').trim()
  const year = Number(searchParams.get('year')) || new Date().getFullYear()
  if (!studentId) throw new ApiError('studentId is required', 400)

  await removeMembership(schoolId, studentId, year)
  return NextResponse.json({ success: true })
})
