/**
 * Standard API route wrapper for ZSMS (Phase 3).
 *
 * Enforcement order:
 *   1. Authentication (unless auth: false)
 *   2. Tenant context (schoolId + scoped Prisma from verified session)
 *   3. Role / permission check
 *   4. Subscription feature-tier gate (+ optional schoolType)
 *   5. Zod body / query validation
 *   6. Handler — errors via withErrorHandler (no stacks / scrubbed IDs in prod)
 *
 * Global subscription expiry still runs first inside withErrorHandler.
 *
 * @example
 * export const POST = withApiHandler(
 *   async ({ user, schoolId, db, body }) => apiOk({ id: body.id }),
 *   { roles: ['ADMIN', 'headteacher'], feature: 'sms-alerts', body: SendSMSSchema }
 * )
 *
 * Public / login:
 *   withApiHandler(handler, { auth: false })
 *
 * Session bootstrap (platform + school):
 *   withApiHandler(handler, { tenant: false })
 */
import { NextResponse } from 'next/server'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getTenantContext, runWithTenantAls } from '@/lib/tenant/context'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolType } from '@/lib/middleware/individual-gate'
import { secureJson } from '@/lib/security/api'
import { bindRequestIdentity } from '@/lib/observability/requestContext'

/**
 * @typedef {object} ApiHandlerOptions
 * @property {boolean} [auth=true]
 * @property {string[]|((user: object) => boolean)} [roles]
 * @property {string|string[]} [feature]
 * @property {('SCHOOL'|'INDIVIDUAL')[]} [schoolTypes]
 * @property {import('zod').ZodTypeAny} [body]
 * @property {import('zod').ZodTypeAny} [query]
 * @property {boolean} [tenant=true]
 * @property {(ctx: ApiHandlerContext) => Promise<Response|void|null>} [after]
 */

/**
 * @typedef {object} ApiHandlerContext
 * @property {Request} request
 * @property {Record<string, string>|undefined} params
 * @property {object|null} user
 * @property {string|null} schoolId
 * @property {string|null} userId
 * @property {ReturnType<import('@/lib/prisma/tenantClient').getTenantClient>|null} db
 * @property {any} [body]
 * @property {any} [query]
 */

function formatZodIssues(error) {
  return (error?.issues || []).map((e) => ({
    field: e.path?.join('.') || '(root)',
    message: e.message,
  }))
}

async function resolveRouteParams(routeContext) {
  const raw = routeContext?.params
  if (!raw) return undefined
  return typeof raw.then === 'function' ? await raw : raw
}

/**
 * @template T
 * @param {Request} request
 * @param {import('zod').ZodType<T>} schema
 * @returns {Promise<T>}
 */
async function parseBody(request, schema) {
  let raw
  try {
    raw = await request.json()
  } catch {
    throw new ApiError('Invalid JSON in request body', 400, { code: 'INVALID_JSON' })
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const details = formatZodIssues(result.error)
    const first = details[0]
    throw new ApiError(
      first ? `Validation failed: ${first.field} — ${first.message}` : 'Validation failed',
      400,
      { code: 'VALIDATION_FAILED', details }
    )
  }
  return result.data
}

/**
 * @template T
 * @param {Request} request
 * @param {import('zod').ZodType<T>} schema
 * @returns {T}
 */
function parseQuery(request, schema) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  const result = schema.safeParse(params)
  if (!result.success) {
    const details = formatZodIssues(result.error)
    const first = details[0]
    throw new ApiError(
      first ? `Invalid query: ${first.field} — ${first.message}` : 'Invalid query parameters',
      400,
      { code: 'VALIDATION_FAILED', details }
    )
  }
  return result.data
}

function assertRoles(user, roles) {
  if (!roles) return
  if (typeof roles === 'function') {
    if (!roles(user)) {
      throw new ApiError('Forbidden', 403, { code: 'FORBIDDEN' })
    }
    return
  }
  if (Array.isArray(roles) && roles.length > 0 && !roleCheck(user, roles)) {
    throw new ApiError('Forbidden', 403, { code: 'FORBIDDEN' })
  }
}

/**
 * Consistent success JSON (security headers applied by withSecureHandler).
 * @param {object} [data]
 * @param {{ status?: number }} [init]
 */
export function apiOk(data = {}, init = {}) {
  const status = init.status || 200
  if (data && typeof data === 'object' && data.success !== undefined) {
    return NextResponse.json(data, { status })
  }
  return NextResponse.json({ success: true, ...data }, { status })
}

/**
 * @param {(ctx: ApiHandlerContext) => Promise<Response|object>} handler
 * @param {ApiHandlerOptions} [options]
 */
export function withApiHandler(handler, options = {}) {
  const {
    auth: requireAuth = true,
    roles = null,
    feature = null,
    schoolTypes = null,
    body: bodySchema = null,
    query: querySchema = null,
    tenant: requireTenant = true,
    after = null,
  } = options

  return withSecureHandler(async function apiHandler(request, routeContext) {
    /** @type {ApiHandlerContext} */
    const ctx = {
      request,
      params: undefined,
      user: null,
      schoolId: null,
      userId: null,
      db: null,
      body: undefined,
      query: undefined,
    }

    ctx.params = await resolveRouteParams(routeContext)

    // 1) Authentication
    if (requireAuth) {
      const auth = await authMiddleware(request)
      if (!auth.isAuthenticated) return auth.response
      ctx.user = auth.user

      // 2) Tenant context (verified session / DB — never body/query)
      if (requireTenant) {
        const tenant = await getTenantContext(request, auth.user)
        if (!tenant.ok) return tenant.response
        ctx.schoolId = tenant.schoolId
        ctx.userId = tenant.userId
        ctx.db = tenant.db
        bindRequestIdentity({ schoolId: tenant.schoolId, userId: tenant.userId })
      } else {
        ctx.userId = String(auth.user?.id || '') || null
        if (ctx.userId) bindRequestIdentity({ userId: ctx.userId })
      }

      // 3) Roles
      assertRoles(auth.user, roles)

      // 4) Feature / school-type gates (need schoolId)
      if (ctx.schoolId && schoolTypes?.length) {
        const typeCheck = await requireSchoolType(ctx.schoolId, schoolTypes)
        if (!typeCheck.allowed) return typeCheck.response
      }

      if (ctx.schoolId && feature) {
        const features = Array.isArray(feature) ? feature : [feature]
        for (const featureId of features) {
          const block = await requireFeature(ctx.schoolId, featureId)
          if (block) return block
        }
      }

      if (typeof after === 'function') {
        const extra = await after(ctx)
        if (extra instanceof Response) return extra
      }
    } else if (typeof after === 'function') {
      const extra = await after(ctx)
      if (extra instanceof Response) return extra
    }

    // 5) Input validation
    if (querySchema) {
      ctx.query = parseQuery(request, querySchema)
    }
    if (bodySchema) {
      ctx.body = await parseBody(request, bodySchema)
    }

    const run = async () => {
      const result = await handler(ctx)
      if (result instanceof Response) return result
      if (result && typeof result === 'object') {
        return secureJson(
          result.success !== undefined ? result : { success: true, ...result },
          { status: 200 },
          request
        )
      }
      return result
    }

    if (ctx.schoolId && ctx.userId) {
      return runWithTenantAls({ schoolId: ctx.schoolId, userId: ctx.userId }, run)
    }
    return run()
  })
}

export { ApiError, parseBody, parseQuery }
