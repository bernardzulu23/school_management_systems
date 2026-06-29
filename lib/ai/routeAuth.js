import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
} from '@/lib/middleware/aiUsageTracker'

/**
 * Shared auth + plan gates for /api/ai/* routes.
 * @param {import('next/server').NextRequest} request
 * @param {{ featureId?: string, roles?: string[] }} [options]
 */
export async function authorizeAiRoute(request, options = {}) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (options.roles?.length && !roleCheck(auth.user, options.roles)) {
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

  const aiToolsBlock = await requireFeature(schoolId, 'ai-tools')
  if (aiToolsBlock) return { ok: false, response: aiToolsBlock }

  if (options.featureId) {
    const featureBlock = await requireFeature(schoolId, options.featureId)
    if (featureBlock) return { ok: false, response: featureBlock }
  }

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'School not found', code: 'SCHOOL_NOT_FOUND' },
        { status: 404 }
      ),
    }
  }

  const perMinuteLimit = getPerMinuteLimit(school.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: options.rateLimitPrefix || 'ai_route_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(auth.user.id || '')}`,
  })
  if (rl.isLimited) return { ok: false, response: rl.response }

  const limitBlock = await checkAILimit(schoolId, String(auth.user.id || ''))
  if (limitBlock) return { ok: false, response: limitBlock }

  return { ok: true, auth, schoolId, school, user: auth.user }
}
