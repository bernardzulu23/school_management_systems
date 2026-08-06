import { NextResponse } from 'next/server'
import { logger, captureError, createRouteLogger } from '../utils/logger'
import { ERROR_MESSAGES, toUserFacingMessage } from '../utils/errorMessages'
import { authMiddleware, roleCheck } from './auth'
import { applySecurityHeaders } from '@/lib/security/headers'
import { enforceSubscriptionIfNeeded } from '@/lib/middleware/subscriptionGate'
import {
  attachRequestIdHeader,
  bindRequestIdentity,
  resolveRequestId,
  runWithRequestContext,
} from '@/lib/observability/requestContext'
import { getTenantAlsStore } from '@/lib/tenant/context'

function sanitizeErrorDetails(value) {
  const raw = String(value || '')
  if (!raw) return raw
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
    .replace(/password=[^&\s]+/gi, 'password=***')
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      '[id]'
    )
    .replace(/\b(c[a-z0-9]{24,})\b/gi, '[id]')
    .slice(0, 2000)
}

/** Strip stack traces and internal IDs from client-facing messages in production. */
function toSafeClientMessage(message, { production, privileged }) {
  let msg = String(message || '')
  if (!production) return msg
  msg = sanitizeErrorDetails(msg)
  msg = msg
    .replace(/\n?\s*at\s+[^\n]+/g, '')
    .replace(/\bat\s+\S+\s+\([^)]+\)/g, '')
    .trim()
  if (!privileged) {
    // already scrubbed
  }
  return msg || message
}

function routeFromRequest(request) {
  try {
    return new URL(request.url).pathname
  } catch {
    return undefined
  }
}

/**
 * Production-safe error handler wrapper for Next.js API routes.
 * Binds requestId ALS, structured request/response logs, x-request-id header.
 */
export function withErrorHandler(handler) {
  return async (request, ...args) => {
    const requestId = resolveRequestId(request)
    const route = routeFromRequest(request)
    const method = String(request?.method || 'GET').toUpperCase()
    const startedAt = Date.now()

    return runWithRequestContext(
      { requestId, route, method, startedAt, schoolId: null, userId: null },
      async () => {
        const log = createRouteLogger({ route, method })
        log.request(request)

        try {
          const subBlock = await enforceSubscriptionIfNeeded(request)
          if (subBlock) {
            applySecurityHeaders(subBlock, request, { cors: false })
            attachRequestIdHeader(subBlock, requestId)
            log.response(subBlock.status, Date.now() - startedAt)
            return subBlock
          }

          const response = await handler(request, ...args)

          // Pull tenant ids if handler bound ALS
          const tenant = getTenantAlsStore()
          if (tenant?.schoolId || tenant?.userId) {
            bindRequestIdentity({
              schoolId: tenant.schoolId,
              userId: tenant.userId,
            })
          }

          if (response instanceof Response) {
            attachRequestIdHeader(response, requestId)
            log.response(response.status, Date.now() - startedAt)
          } else {
            log.response(200, Date.now() - startedAt)
          }
          return response
        } catch (error) {
          const tenant = getTenantAlsStore()
          captureError(error, {
            route,
            requestId,
            schoolId: tenant?.schoolId || undefined,
            userId: tenant?.userId || undefined,
          })
          logger.error('API Error', error, { route, requestId })

          const status = error.status || 500
          const code = error?.code || error?.name || 'UNKNOWN'
          const auth = await authMiddleware(request)
          const isPrivileged =
            auth?.isAuthenticated && roleCheck(auth.user, ['ADMIN', 'headteacher', 'HEADTEACHER'])
          const exposeMessage = error instanceof ApiError && status >= 502 && status <= 503

          const production = process.env.NODE_ENV === 'production'
          const rawMessage = error.message || ERROR_MESSAGES.SERVER_ERROR
          const safeFallback =
            status >= 500
              ? ERROR_MESSAGES.SERVER_ERROR
              : status === 401 || status === 403
                ? ERROR_MESSAGES.UNAUTHORIZED
                : ERROR_MESSAGES.VALIDATION_ERROR
          const facing =
            status >= 500 && !exposeMessage
              ? ERROR_MESSAGES.SERVER_ERROR
              : toUserFacingMessage(rawMessage, safeFallback)
          const message = toSafeClientMessage(facing, {
            production,
            privileged: isPrivileged,
          })

          const validationDetails = Array.isArray(error?.details) ? error.details : null

          const response = NextResponse.json(
            {
              success: false,
              error: message,
              message,
              code,
              requestId,
              ...(validationDetails && status < 500 ? { details: validationDetails } : {}),
              ...(production &&
                status >= 500 &&
                isPrivileged && {
                  details: sanitizeErrorDetails(error?.message || error),
                }),
            },
            {
              status,
              headers: {
                'x-error-code': String(code),
                'x-request-id': requestId,
                'Cache-Control': 'no-store',
              },
            }
          )
          applySecurityHeaders(response, request, { cors: false })
          log.response(status, Date.now() - startedAt)
          return response
        }
      }
    )
  }
}

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} [status=400]
   * @param {{ code?: string, details?: unknown }} [options]
   */
  constructor(message, status = 400, options = {}) {
    super(message)
    this.status = status
    this.name = 'ApiError'
    this.code = options.code || 'API_ERROR'
    if (options.details !== undefined) this.details = options.details
  }
}
