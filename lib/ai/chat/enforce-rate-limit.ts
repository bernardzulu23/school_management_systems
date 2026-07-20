/**
 * Chat-specific Upstash daily limits (config-driven via rate-limits.ts).
 * Falls back to no-op when UPSTASH_REDIS_* is unset (same as withAILimits).
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'
import type { ChatUserRole } from '@prisma/client'
import { getChatRateLimit } from '@/lib/ai/chat/rate-limits'

let redisClient: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url?.trim() || !token?.trim()) return null
  if (!redisClient) {
    redisClient = new Redis({ url: url.trim(), token: token.trim() })
  }
  return redisClient
}

const limiterCache = new Map<string, Ratelimit>()

function getLimiter(role: ChatUserRole): Ratelimit | null {
  const cfg = getChatRateLimit(role)
  if (cfg.maxRequests == null || cfg.maxRequests <= 0) return null
  const redis = getRedis()
  if (!redis) return null

  const key = `${role}:${cfg.maxRequests}:${cfg.windowSec}`
  let limiter = limiterCache.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.maxRequests, `${cfg.windowSec} s`),
      prefix: `zsms:chat:${role.toLowerCase()}`,
      analytics: true,
    })
    limiterCache.set(key, limiter)
  }
  return limiter
}

export type ChatRateLimitResult =
  | { limited: false; remaining?: number }
  | { limited: true; response: NextResponse }

/**
 * Enforce per-role chat daily limit. PLATFORM_ADMIN (null max) and unset Upstash → pass.
 * STUDENT (max 0) is always blocked at the role gate before this runs.
 */
export async function enforceChatRateLimit(
  request: Request,
  role: ChatUserRole,
  userId: string
): Promise<ChatRateLimitResult> {
  const cfg = getChatRateLimit(role)
  if (cfg.maxRequests == null) return { limited: false }
  if (cfg.maxRequests <= 0) {
    const denied = NextResponse.json(
      { error: 'Chat is not enabled for this role', code: 'CHAT_ROLE_DISABLED' },
      { status: 403 }
    )
    applySecurityHeaders(denied, request, { cors: false })
    return { limited: true, response: denied }
  }

  const limiter = getLimiter(role)
  if (!limiter) return { limited: false }

  const { success, remaining, reset } = await limiter.limit(`user:${userId}`)
  if (success) return { limited: false, remaining }

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  const limited = NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Daily chat limit reached. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'RateLimit-Limit': String(cfg.maxRequests),
        'RateLimit-Remaining': '0',
        'RateLimit-Reset': String(Math.ceil(reset / 1000)),
        'Cache-Control': 'no-store',
      },
    }
  )
  applySecurityHeaders(limited, request, { cors: false })
  return { limited: true, response: limited }
}
