/**
 * Access-token claims for school users.
 * Teachers who hold a HeadOfDepartment row are treated as HOD for portal gates.
 */

export function resolveAccessTokenRole(user) {
  const role = String(user?.role || '').trim()
  const hasHodProfile = Boolean(user?.hodProfile) || user?.isHod === true
  const key = role.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (hasHodProfile && (key === 'teacher' || key === 'classteacher' || key === 'seniorteacher')) {
    return 'hod'
  }
  return role || 'teacher'
}

export function buildSchoolAccessClaims(user) {
  const hasHodProfile = Boolean(user?.hodProfile) || user?.isHod === true
  const role = resolveAccessTokenRole(user)
  return {
    id: user.id,
    email: user.email,
    role,
    schoolId: user.schoolId,
    ...(hasHodProfile || role === 'hod' ? { isHod: true } : {}),
  }
}
