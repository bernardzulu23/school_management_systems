import { LRUCache } from 'lru-cache'
import { NextResponse } from 'next/server'

// Configure LRU Cache for rate limiting
const tokenCache = new LRUCache({
  max: 1000, // Max users/IPs to track
  ttl: 5 * 60 * 1000, // 5 minute window (aligned with user request)
})

function getClientIp(request) {
  const xff = String(request.headers.get('x-forwarded-for') || '').trim()
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xrip = String(request.headers.get('x-real-ip') || '').trim()
  if (xrip) return xrip
  return '127.0.0.1'
}

export function rateLimiter(request, options = {}) {
  const {
    limit = process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for dev
    windowMs = 5 * 60 * 1000, // 5 minutes window
    keyPrefix = 'rl_',
    keyGenerator,
  } = options

  const ip = getClientIp(request)
  const keyBase = typeof keyGenerator === 'function' ? keyGenerator({ request, ip }) : ip
  const key = `${keyPrefix}${keyBase}`

  const now = Date.now()
  const current = tokenCache.get(key)
  const currentUsage = typeof current === 'number' ? current : (current?.count ?? 0)
  const currentResetAt =
    typeof current === 'number' ? now + windowMs : (current?.resetAt ?? now + windowMs)

  const isExpired = now >= currentResetAt
  const nextResetAt = isExpired ? now + windowMs : currentResetAt
  const nextCount = (isExpired ? 0 : currentUsage) + 1

  if (!isExpired && currentUsage >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((currentResetAt - now) / 1000))
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
            'RateLimit-Reset': String(Math.ceil(currentResetAt / 1000)),
          },
        }
      ),
    }
  }

  const ttlMs = Math.max(1, nextResetAt - now)
  tokenCache.set(key, { count: nextCount, resetAt: nextResetAt }, { ttl: ttlMs })
  return { isLimited: false, remaining: Math.max(0, limit - nextCount), resetAt: nextResetAt }
}
