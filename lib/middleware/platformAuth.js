import { normalizeRole } from '@/lib/middleware/auth'

export const PLATFORM_ROLE = 'superadmin'

export function isPlatformToken(user) {
  return Boolean(user?.isPlatform) && normalizeRole(user?.role) === PLATFORM_ROLE
}

export function requirePlatformAdmin(user) {
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }
  if (!isPlatformToken(user)) {
    return { ok: false, status: 403, error: 'Platform administrator access required' }
  }
  return { ok: true }
}
