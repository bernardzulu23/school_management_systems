/**
 * Provisional per-role daily chat limits (Upstash sliding window).
 * Tune against real Groq/Gemini/OpenRouter cost data — keep as config, not inline.
 */
import type { ChatUserRole } from '@prisma/client'

export type ChatRateLimitConfig = {
  /** Max messages per window; null = unlimited */
  maxRequests: number | null
  /** Window length in seconds */
  windowSec: number
}

/** 100 / day for school staff; STUDENT not enabled in Phase 1; PLATFORM_ADMIN unlimited. */
export const CHAT_RATE_LIMITS: Record<ChatUserRole, ChatRateLimitConfig> = {
  TEACHER: { maxRequests: 100, windowSec: 86_400 },
  HOD: { maxRequests: 100, windowSec: 86_400 },
  HEADTEACHER: { maxRequests: 100, windowSec: 86_400 },
  SOLO_TEACHER: { maxRequests: 100, windowSec: 86_400 },
  STUDENT: { maxRequests: 0, windowSec: 86_400 },
  PLATFORM_ADMIN: { maxRequests: null, windowSec: 86_400 },
}

export function getChatRateLimit(role: ChatUserRole): ChatRateLimitConfig {
  return CHAT_RATE_LIMITS[role] ?? { maxRequests: 0, windowSec: 86_400 }
}
