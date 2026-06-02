import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'

/**
 * @param {import('@upstash/ratelimit').Ratelimit | null} limiter
 * @param {(request: import('next/server').NextRequest) => Promise<string> | string} keyFn
 * @param {(request: import('next/server').NextRequest, context?: unknown) => Promise<Response>} handler
 */
export function withRateLimit(limiter, keyFn, handler) {
  return async function rateLimitedHandler(request, context) {
    if (limiter) {
      const key = typeof keyFn === 'function' ? await keyFn(request) : String(keyFn)
      const { success, limit, remaining, reset } = await limiter.limit(key)
      if (!success) {
        const resetMs = typeof reset === 'number' ? reset : Date.now() + 60_000
        const retryAfter = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000))
        const res = NextResponse.json(
          { error: 'Too many requests. Please slow down.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(resetMs),
              'Retry-After': String(retryAfter),
            },
          }
        )
        applySecurityHeaders(res, request, { cors: false })
        return res
      }
    }
    return handler(request, context)
  }
}
