import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'

const NO_STORE_PREFIXES = [
  '/api/auth',
  '/api/account',
  '/api/profile',
  '/api/ecz',
  '/api/onboarding',
]

function shouldNoStore(request) {
  try {
    const path = new URL(request.url).pathname
    if (path === '/api/ping') return false
    if (path.startsWith('/api/health') && !path.includes('db=1')) return false
    return path.startsWith('/api/') && NO_STORE_PREFIXES.some((p) => path.startsWith(p))
  } catch {
    return true
  }
}

/**
 * Apply security headers and cache policy to any Response returned from API handlers.
 */
export function ensureSecureResponse(response, request) {
  if (!(response instanceof Response)) return response

  applySecurityHeaders(response, request)

  if (request && shouldNoStore(request) && !response.headers.get('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Pragma', 'no-store')
  }

  return response
}

/**
 * Wrap a route handler so all Response/NextResponse returns get security headers.
 */
export function withSecureApi(handler) {
  return async (request, context) => {
    const result = await handler(request, context)
    return ensureSecureResponse(result, request)
  }
}

import { withErrorHandler } from '@/lib/middleware/errorHandler'

/**
 * Compose secure responses with the global error handler.
 */
export function withSecureHandler(handler) {
  return withErrorHandler(withSecureApi(handler))
}
