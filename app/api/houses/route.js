export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { createHouse, listHousesWithStats } from '@/lib/houses'

export const GET = withErrorHandler(async function GET(request) {
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

  const year = Number(new URL(request.url).searchParams.get('year')) || new Date().getFullYear()
  const data = await listHousesWithStats(schoolId, year)
  return NextResponse.json({ success: true, year, data })
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

  const planGate = await requireFeature(schoolId, 'inter-house')
  if (planGate instanceof NextResponse) return planGate

  const body = await request.json().catch(() => ({}))
  try {
    const house = await createHouse(schoolId, body)
    return NextResponse.json({ success: true, data: house }, { status: 201 })
  } catch (e) {
    if (e?.code === 'P2002') {
      throw new ApiError('A house with this name already exists', 400)
    }
    throw e
  }
})
