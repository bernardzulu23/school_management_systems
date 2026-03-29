import { LRUCache } from 'lru-cache'
import { NextResponse } from 'next/server'

// Configure LRU Cache for rate limiting
const tokenCache = new LRUCache({
  max: 1000, // Max users/IPs to track
  ttl: 15 * 60 * 1000, // 15 minute window (aligned with user request)
})

export function rateLimiter(request, options = {}) {
  const {
    limit = process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for dev
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyPrefix = 'rl_',
    keyGenerator,
  } = options

  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
  const keyBase = typeof keyGenerator === 'function' ? keyGenerator({ request, ip }) : ip
  const key = `${keyPrefix}${keyBase}`

  const now = Date.now()
  const current = tokenCache.get(key)
  const currentUsage = typeof current === 'number' ? current : (current?.count ?? 0)
  const resetAt =
    typeof current === 'number' ? now + windowMs : (current?.resetAt ?? now + windowMs)

  if (currentUsage >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000))
    return {
      isLimited: true,
      response: new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please try again later.',
          retryAfter: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfterSeconds.toString(),
            'RateLimit-Limit': String(limit),
            'RateLimit-Remaining': '0',
            'RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        }
      ),
    }
  }

  tokenCache.set(key, { count: currentUsage + 1, resetAt }, { ttl: windowMs })
  return { isLimited: false, remaining: Math.max(0, limit - (currentUsage + 1)), resetAt }
}
