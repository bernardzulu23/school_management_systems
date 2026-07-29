/**
 * Access-token claims for school users.
 * Teachers who hold a HeadOfDepartment row are treated as HOD for portal gates.
 * Teachers with an active GuidanceAssignment get isGuidance for /dashboard/guidance.
 * Teachers with an active SeniorTeacherAssignment get isSeniorTeacher for /dashboard/senior-teacher.
 */

function hasActiveGuidanceAssignment(user) {
  if (user?.isGuidance === true) return true
  const a = user?.guidanceAssignment
  return Boolean(a?.id && a?.active !== false && !a?.revokedAt)
}

function hasActiveSeniorTeacherAssignment(user) {
  if (user?.isSeniorTeacher === true) return true
  const a = user?.seniorTeacherAssignment
  return Boolean(a?.id && a?.active !== false && !a?.revokedAt)
}

export function resolveAccessTokenRole(user) {
  const role = String(user?.role || '').trim()
  return role || 'teacher'
}

export function buildSchoolAccessClaims(user) {
  const hasHodProfile = Boolean(user?.hodProfile) || user?.isHod === true
  const hasGuidance = hasActiveGuidanceAssignment(user)
  const hasSeniorTeacher = hasActiveSeniorTeacherAssignment(user)
  const role = resolveAccessTokenRole(user)
  return {
    id: user.id,
    email: user.email,
    role,
    schoolId: user.schoolId,
    ...(hasHodProfile || role === 'hod' ? { isHod: true } : {}),
    ...(hasGuidance ? { isGuidance: true } : {}),
    ...(hasSeniorTeacher ? { isSeniorTeacher: true } : {}),
  }
}
