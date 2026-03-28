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
  } = options

  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
  const key = `${keyPrefix}${ip}`

  const currentUsage = tokenCache.get(key) || 0

  if (currentUsage >= limit) {
    return {
      isLimited: true,
      response: new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(windowMs / 1000).toString(),
          },
        }
      ),
    }
  }

  tokenCache.set(key, currentUsage + 1)
  return { isLimited: false }
}
