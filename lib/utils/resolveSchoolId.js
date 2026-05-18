import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

/**
 * Prefer JWT schoolId (logged-in user), then subdomain/header resolution.
 */
export async function resolveSchoolId(request, user = null) {
  const fromUser = user?.schoolId || null
  if (fromUser) return fromUser
  return getSchoolIdFromRequest(request)
}
