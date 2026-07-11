import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/utils/logger'

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

export function sha256Payload(payload: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex')
}

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '')
  const code =
    typeof error === 'object' && error && 'code' in error ? String((error as any).code) : ''
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    /AiCache/i.test(msg) ||
    /does not exist/i.test(msg) ||
    /relation .* does not exist/i.test(msg)
  )
}

/**
 * Read semantic AI cache. Returns null on miss or if AiCache table is unavailable
 * (e.g. migration not yet applied) so AI routes never 500 solely due to cache.
 */
export async function getCachedAIResponse<T>(
  featureKey: string,
  payload: unknown
): Promise<T | null> {
  try {
    const payloadHash = sha256Payload(payload)
    const row = await prisma.aiCache.findUnique({
      where: { featureKey_payloadHash: { featureKey, payloadHash } },
      select: { cachedResponse: true },
    })
    return (row?.cachedResponse as T) ?? null
  } catch (error) {
    if (isMissingTableError(error)) {
      logger.warn('ai.cache.unavailable', {
        featureKey,
        message: error instanceof Error ? error.message : String(error),
      })
      return null
    }
    logger.warn('ai.cache.read_failed', {
      featureKey,
      message: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Write semantic AI cache. No-ops on failure so generation still succeeds.
 */
export async function setCachedAIResponse(
  featureKey: string,
  payload: unknown,
  cachedResponse: unknown
): Promise<void> {
  try {
    const payloadHash = sha256Payload(payload)
    await prisma.aiCache.upsert({
      where: { featureKey_payloadHash: { featureKey, payloadHash } },
      create: {
        featureKey,
        payloadHash,
        cachedResponse: cachedResponse as object,
      },
      update: {
        cachedResponse: cachedResponse as object,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    if (isMissingTableError(error)) {
      logger.warn('ai.cache.unavailable', {
        featureKey,
        message: error instanceof Error ? error.message : String(error),
      })
      return
    }
    logger.warn('ai.cache.write_failed', {
      featureKey,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
