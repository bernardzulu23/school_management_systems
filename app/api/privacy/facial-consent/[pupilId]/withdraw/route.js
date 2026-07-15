export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { withdrawFacialConsent } from '@/lib/consent/consentService'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

const ADMIN_ROLES = ['ADMIN', 'headteacher', 'ADMINISTRATOR']

/** Withdraw active facial consent for a pupil (clears face template). */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const pupilId = await safeRouteParam(params, 'pupilId')
  if (!pupilId) throw new ApiError('pupilId required', 400)

  const body = await request.json().catch(() => ({}))
  try {
    const record = await withdrawFacialConsent({
      schoolId,
      pupilId,
      notes: body.notes,
      actorUser: auth.user,
      withdrawnByName: body.withdrawnByName,
      withdrawnByRelationship: body.withdrawnByRelationship,
    })
    return NextResponse.json({ success: true, data: record })
  } catch (e) {
    throw new ApiError(e.message || 'Failed', e.status || 400)
  }
})
