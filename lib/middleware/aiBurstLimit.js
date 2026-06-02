import { LRUCache } from 'lru-cache'
import { NextResponse } from 'next/server'

const burstCache = new LRUCache({ max: 5000, ttl: 60 * 1000 })

/**
 * Burst limiter for AI routes (20 req / 60s per user) on top of monthly checkAILimit.
 * @param {string} userId
 * @param {{ limit?: number, windowMs?: number }} [opts]
 */
export function checkAIBurstLimit(userId, opts = {}) {
  const limit = opts.limit ?? 20
  const windowMs = opts.windowMs ?? 60 * 1000
  const key = `ai_burst:${String(userId || 'anon')}`
  const now = Date.now()
  const entry = burstCache.get(key)
  const count = entry?.count ?? 0
  const resetAt = entry?.resetAt ?? now + windowMs

  if (entry && now < resetAt && count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000))
    return NextResponse.json(
      {
        error: 'Too many requests. Please slow down.',
        code: 'AI_BURST_LIMIT',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      }
    )
  }

  const nextCount = entry && now < resetAt ? count + 1 : 1
  const nextReset = entry && now < resetAt ? resetAt : now + windowMs
  burstCache.set(key, { count: nextCount, resetAt: nextReset }, { ttl: windowMs })

  return null
}
