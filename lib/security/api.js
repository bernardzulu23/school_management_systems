import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'

/**
 * JSON response with standard security headers applied.
 */
export function secureJson(data, init = {}, request = null) {
  const status = init.status || 200
  const response = NextResponse.json(data, {
    ...init,
    status,
    headers: {
      ...(init.headers || {}),
      'Cache-Control': init.headers?.['Cache-Control'] || 'no-store',
      Pragma: 'no-store',
    },
  })

  if (request) applySecurityHeaders(response, request)
  else applySecurityHeaders(response, null, { cors: false })

  return response
}
