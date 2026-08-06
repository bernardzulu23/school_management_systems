/**
 * Phase 5 M3 — log staff / platform reads of sensitive pupil or cross-tenant data.
 * Best-effort: never fail the request if logging fails.
 */
import { basePrisma } from '@/lib/prisma/client'
import { runAsPlatform } from '@/lib/tenant/context'

/**
 * @param {{
 *   schoolId?: string | null
 *   actorUserId: string
 *   actorRole?: string | null
 *   action: string
 *   resourceType: string
 *   resourceId?: string | null
 *   fieldsAccessed?: string[]
 *   ip?: string | null
 *   userAgent?: string | null
 *   metadata?: object
 * }} entry
 */
export async function logPiiAccess(entry) {
  try {
    const actorUserId = String(entry.actorUserId || '').trim()
    if (!actorUserId) return

    await runAsPlatform(() =>
      basePrisma.piiAccessLog.create({
        data: {
          schoolId: entry.schoolId ? String(entry.schoolId) : null,
          actorUserId,
          actorRole: entry.actorRole ? String(entry.actorRole).slice(0, 64) : null,
          action: String(entry.action || 'READ').slice(0, 64),
          resourceType: String(entry.resourceType || 'unknown').slice(0, 64),
          resourceId: entry.resourceId ? String(entry.resourceId).slice(0, 128) : null,
          fieldsAccessed: Array.isArray(entry.fieldsAccessed)
            ? entry.fieldsAccessed.map((f) => String(f).slice(0, 64)).slice(0, 40)
            : [],
          ip: entry.ip ? String(entry.ip).slice(0, 64) : null,
          userAgent: entry.userAgent ? String(entry.userAgent).slice(0, 256) : null,
          metadata:
            entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : undefined,
        },
      })
    )
  } catch (err) {
    console.warn('[piiAccessLog] failed:', err?.message || err)
  }
}

/**
 * @param {Request} request
 */
export function clientMetaFromRequest(request) {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent')
  return { ip, userAgent }
}
