/**
 * HOD feature gate — blocks primary-only schools from HOD module APIs/UI.
 * Prefer resolveHodScope (which already calls requireHodSchoolAccess).
 * This helper is for routes that do not go through resolveHodScope.
 */

import { requireHodSchoolAccess } from '@/lib/school/hodAccess'

/**
 * @param {string|null|undefined} schoolId
 * @returns {Promise<import('next/server').NextResponse|null>}
 */
export async function hodFeatureGate(schoolId) {
  if (!schoolId) return null
  const check = await requireHodSchoolAccess(schoolId)
  if (!check.ok) return check.response
  return null
}
