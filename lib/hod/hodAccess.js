/**
 * Client/server-shared HOD portal access.
 * Matches sidebar + JWT claims: role "hod", isHod flag, or hodProfile row.
 */
export function hasHodPortalAccess(user) {
  if (!user) return false
  const role = String(user.role || '')
    .trim()
    .toLowerCase()
  if (
    role === 'hod' ||
    role === 'head of department' ||
    role === 'headteacher' ||
    role === 'admin' ||
    role === 'administrator' ||
    role === 'superadmin'
  ) {
    return true
  }
  return Boolean(user.isHod || user.hodProfile)
}
