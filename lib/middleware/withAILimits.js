import { getAuthUser } from '@/lib/middleware/auth'
import { getAiLimiter } from '@/lib/middleware/upstashLimiters'
import { withRateLimit } from '@/lib/middleware/withRateLimit'

const aiLimiter = getAiLimiter()

async function aiRateKey(request) {
  const user = await getAuthUser(request)
  if (user?.id) return `user:${user.id}`
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return `ip:${ip}`
}

/**
 * Upstash AI burst limit (20/min per user). No-op when Upstash env is unset.
 * @param {(request: import('next/server').NextRequest, context?: unknown) => Promise<Response>} handler
 */
export function withAILimits(handler) {
  if (!aiLimiter) return handler
  return withRateLimit(aiLimiter, aiRateKey, handler)
}
