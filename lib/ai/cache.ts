import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

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

export async function getCachedAIResponse<T>(
  featureKey: string,
  payload: unknown
): Promise<T | null> {
  const payloadHash = sha256Payload(payload)
  const row = await prisma.aiCache.findUnique({
    where: { featureKey_payloadHash: { featureKey, payloadHash } },
    select: { cachedResponse: true },
  })
  return (row?.cachedResponse as T) ?? null
}

export async function setCachedAIResponse(
  featureKey: string,
  payload: unknown,
  cachedResponse: unknown
): Promise<void> {
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
}
