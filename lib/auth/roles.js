import { ROLE_ALIASES, ROLE_GROUPS, normalizeRole, roleCheck } from '@/lib/middleware/auth'

export { ROLE_GROUPS, ROLE_ALIASES, normalizeRole, roleCheck }

export function isSchoolStaffRole(role) {
  return roleCheck({ role }, ROLE_GROUPS.SCHOOL_STAFF)
}

export function staffRoleDeniedMessage(role) {
  const r = normalizeRole(role)
  if (r === 'student') {
    return 'You are signed in as a student. Use teacher@zsms.local (or HOD/headteacher) to create ECZ assessments and use the Question Bank.'
  }
  return 'You do not have permission for this action. Teachers, HODs, and headteachers only.'
}
