import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

export const NAVBOT_DAILY_LIMIT = 50

let redisClient: Redis | null = null
let limiter: Ratelimit | null | undefined

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url?.trim() || !token?.trim()) return null
  if (!redisClient) {
    redisClient = new Redis({ url: url.trim(), token: token.trim() })
  }
  return redisClient
}

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter
  const redis = getRedis()
  if (!redis) {
    limiter = null
    return limiter
  }

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(NAVBOT_DAILY_LIMIT, '86400 s'),
    prefix: 'zsms:navbot:student',
    analytics: true,
  })
  return limiter
}

export type NavBotRateLimitResult =
  | { limited: false; remaining?: number }
  | { limited: true; response: NextResponse }

export async function enforceNavBotRateLimit(studentId: string): Promise<NavBotRateLimitResult> {
  const activeLimiter = getLimiter()
  if (!activeLimiter) return { limited: false }

  const { success, remaining, reset } = await activeLimiter.limit(`student:${studentId}`)
  if (success) return { limited: false, remaining }

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return {
    limited: true,
    response: NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Daily navigation bot limit reached. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'RateLimit-Limit': String(NAVBOT_DAILY_LIMIT),
          'RateLimit-Remaining': '0',
          'RateLimit-Reset': String(Math.ceil(reset / 1000)),
          'Cache-Control': 'no-store',
        },
      }
    ),
  }
}
