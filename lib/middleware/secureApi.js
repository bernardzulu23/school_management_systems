import { applySecurityHeaders } from '@/lib/security/headers'
import { stripCacheValidators } from '@/lib/security/webCacheDeception'

/**
 * Apply security headers and cache policy to any Response returned from API handlers.
 * WCD Fix 3: authenticated/API responses must never be cached; strip validators.
 */
export function ensureSecureResponse(response, request) {
  if (!(response instanceof Response)) return response

  applySecurityHeaders(response, request)

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.headers.set('Surrogate-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  stripCacheValidators(response)

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
