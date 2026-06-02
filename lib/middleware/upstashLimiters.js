import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redisClient = null

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url?.trim() || !token?.trim()) return null
  if (!redisClient) {
    redisClient = new Redis({ url: url.trim(), token: token.trim() })
  }
  return redisClient
}

/**
 * @param {number} requests
 * @param {number} windowSec
 * @param {string} prefix
 * @returns {import('@upstash/ratelimit').Ratelimit | null}
 */
function buildLimiter(requests, windowSec, prefix) {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSec} s`),
    prefix: `zsms:${prefix}`,
    analytics: true,
  })
}

/** 20 req / 60s — AI burst (per userId) */
export function getAiLimiter() {
  return buildLimiter(20, 60, 'ai')
}

/** 100 req / 60s — general authenticated API */
export function getGeneralApiLimiter() {
  return buildLimiter(100, 60, 'api')
}

/** 10 req / 300s — heavy exports */
export function getExportLimiter() {
  return buildLimiter(10, 300, 'export')
}

/** 30 req / 60s — QR attendance */
export function getQrAttendanceLimiter() {
  return buildLimiter(30, 60, 'qr-attendance')
}

export function isUpstashConfigured() {
  return Boolean(getRedis())
}
