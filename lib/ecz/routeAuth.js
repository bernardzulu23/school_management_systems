import { roleCheck } from '@/lib/middleware/auth'

export const ECZ_STAFF_ROLES = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const ECZ_MANAGE_ROLES = ['HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const ECZ_SUBMIT_ROLES = ['ADMIN', 'headteacher', 'HOD', 'hod']

export const EVIDENCE_STATUS_FILTERS = new Set(['ok', 'urgent', 'expired'])

export const MODERATION_STATUSES = new Set(['APPROVED', 'REJECTED', 'PENDING'])

export function isEczStaff(user) {
  return roleCheck(user, ECZ_STAFF_ROLES)
}

export function isEczManager(user) {
  return roleCheck(user, ECZ_MANAGE_ROLES)
}
