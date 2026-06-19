import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { assertFeeManagementAllowed } from '@/lib/school/feeManagementAccess'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

/**
 * Standard auth for fee-management API routes.
 */
export async function authorizeFeeRoute(request, roles = ['ADMIN', 'headteacher']) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, roles)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const planGate = await requireFeature(schoolId, 'fee-management')
  if (planGate instanceof NextResponse) return { ok: false, response: planGate }

  const ownershipGate = await assertFeeManagementAllowed(schoolId)
  if (ownershipGate) return { ok: false, response: ownershipGate }

  return { ok: true, auth, schoolId }
}

/**
 * Parent portal — student role, private schools only.
 */
export async function authorizeParentPortalRoute(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const portalGate = await requireSchoolTypeAccess(schoolId, 'parent-portal')
  if (portalGate) return { ok: false, response: portalGate }

  return { ok: true, auth, schoolId }
}

/**
 * Proprietor / owner dashboard KPIs.
 */
export async function authorizeProprietorRoute(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const dashGate = await requireSchoolTypeAccess(schoolId, 'proprietor-dashboard')
  if (dashGate) return { ok: false, response: dashGate }

  const planGate = await requireFeature(schoolId, 'fee-management')
  if (planGate instanceof NextResponse) return { ok: false, response: planGate }

  return { ok: true, auth, schoolId }
}
