import { resolveAuthenticatedSchoolId, resolvePublicSchoolId } from '@/lib/tenant/resolveSchoolId'

/**
 * Prefer verified DB school for authenticated users; public resolution otherwise.
 */
export async function resolveSchoolId(request, user = null) {
  if (user?.id) {
    const result = await resolveAuthenticatedSchoolId(request, user)
    if (!result.ok) return null
    return result.schoolId
  }
  return resolvePublicSchoolId(request)
}

/**
 * For route handlers — returns { ok, schoolId, response } without throwing.
 */
export { resolveAuthenticatedSchoolId, resolvePublicSchoolId }
