import { roleCheck } from '@/lib/middleware/auth'

export function isSchoolAdminOrHead(user) {
  return roleCheck(user, ['ADMIN'])
}

export function hasHodRoleLabel(user) {
  return roleCheck(user, ['HOD', 'hod'])
}

/** HOD allocation APIs: role HOD or linked HeadOfDepartment row (often role is still "teacher"). */
export function canManageDepartmentAllocations(user, hodProfile) {
  return isSchoolAdminOrHead(user) || hasHodRoleLabel(user) || Boolean(hodProfile)
}
