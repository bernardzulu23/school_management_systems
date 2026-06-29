import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

const ADMIN_ROLES = ['ADMIN', 'headteacher']

/**
 * Standard auth for school admin API routes.
 * @param {import('next/server').NextRequest} request
 * @param {string[]} [roles]
 */
export async function authorizeAdminRoute(request, roles = ADMIN_ROLES) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, roles)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 }),
    }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'School context required', code: 'SCHOOL_REQUIRED' },
        { status: 400 }
      ),
    }
  }

  return { ok: true, auth, schoolId }
}

/**
 * Parse dry-run flag from query string or JSON body.
 * @param {import('next/server').NextRequest} request
 * @param {Record<string, unknown>} [body]
 */
export function parseDryRun(request, body = {}) {
  const params = new URL(request.url).searchParams
  if (params.get('dryRun') === 'true' || params.get('dryRun') === '1') return true
  return Boolean(body?.dryRun)
}
