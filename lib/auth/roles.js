import { ROLE_ALIASES, ROLE_GROUPS, normalizeRole, roleCheck } from '@/lib/middleware/auth'

export { ROLE_GROUPS, ROLE_ALIASES, normalizeRole, roleCheck }

export function isSchoolStaffRole(role) {
  return roleCheck({ role }, ROLE_GROUPS.SCHOOL_STAFF)
}

export function staffRoleDeniedMessage(role) {
  void role
  return 'This request was blocked for security reasons.'
}
