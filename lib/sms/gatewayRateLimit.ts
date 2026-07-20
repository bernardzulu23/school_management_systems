/**
 * Per-gateway SMS dispatch rate limit: 100 messages / 5 minutes.
 * When Upstash is unset (local dev), allows all dispatches.
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const WINDOW = '5 m'
const MAX = 100

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
    return null
  }
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX, WINDOW),
    prefix: 'zsms:sms-gateway',
    analytics: true,
  })
  return limiter
}

/**
 * Try to reserve `count` dispatch slots for this gateway.
 * On limit exceeded, returns success:false — leave rows PENDING for next poll.
 */
export async function tryReserveGatewayDispatch(
  gatewayId: string,
  count: number
): Promise<{ success: boolean; allowed: number }> {
  const n = Math.max(0, Math.floor(count))
  if (n === 0) return { success: true, allowed: 0 }

  const lim = getLimiter()
  if (!lim) return { success: true, allowed: n }

  let allowed = 0
  for (let i = 0; i < n; i++) {
    const { success } = await lim.limit(`gateway:${gatewayId}`)
    if (!success) break
    allowed++
  }

  return { success: allowed > 0 || n === 0, allowed }
}
