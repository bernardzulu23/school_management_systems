import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSchoolType } from '@/lib/middleware/individual-gate'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

/**
 * Standard auth stack for government-only API routes.
 * @returns {Promise<{ ok: true, auth: object, schoolId: string } | { ok: false, response: NextResponse }>}
 */
export async function authorizeGovernmentRoute(
  request,
  featureKey,
  roles = ['ADMIN', 'headteacher']
) {
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

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return { ok: false, response: typeCheck.response }

  const planGate = await requireFeature(schoolId, featureKey)
  if (planGate instanceof NextResponse) return { ok: false, response: planGate }

  const ownershipGate = await requireSchoolTypeAccess(schoolId, featureKey)
  if (ownershipGate) return { ok: false, response: ownershipGate }

  return { ok: true, auth, schoolId }
}

export function parseYearParam(searchParams, fallback = new Date().getFullYear()) {
  const raw = Number(searchParams.get('year'))
  return Number.isFinite(raw) && raw >= 2000 && raw <= 2100 ? raw : fallback
}
