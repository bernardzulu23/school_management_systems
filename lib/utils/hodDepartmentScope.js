import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

export async function getHodProfile(prisma, userId, schoolId) {
  if (!userId || !schoolId) return null
  const profile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    select: { id: true, departmentId: true, department: true },
  })
  if (profile) return profile
  return prisma.headOfDepartment.findFirst({
    where: { schoolId, user: { id: userId } },
    select: { id: true, departmentId: true, department: true },
  })
}

export async function resolveHodDepartmentIds(prisma, schoolId, hodProfile) {
  if (!hodProfile) return []
  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.department,
  })
  return resolved.departmentIds
}

/**
 * Pick the department an HOD (or admin) may use when creating allocations.
 */
export async function resolveAllocationDepartmentId({
  prisma,
  schoolId,
  isAdminOrHead,
  hodProfile,
  requestedDepartmentId,
}) {
  const requested = String(requestedDepartmentId || '').trim()

  if (isAdminOrHead) {
    if (!requested) return { error: 'departmentId is required', status: 400 }
    const dept = await prisma.department.findFirst({
      where: { id: requested, schoolId },
      select: { id: true },
    })
    if (!dept) return { error: 'Invalid department for this school', status: 400 }
    return { departmentId: requested }
  }

  if (!hodProfile) return { error: 'HOD profile not found', status: 404 }

  if (!requested && hodProfile.departmentId) {
    return { departmentId: String(hodProfile.departmentId) }
  }

  const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
  if (allowedIds.length === 0) {
    if (!requested) return { error: 'HOD department is not configured', status: 400 }
    const dept = await prisma.department.findFirst({
      where: { id: requested, schoolId },
      select: { id: true },
    })
    if (!dept) return { error: 'Invalid department for this school', status: 400 }
    return { departmentId: requested }
  }

  if (requested && allowedIds.includes(requested)) {
    return { departmentId: requested }
  }

  if (!requested || !allowedIds.includes(requested)) {
    if (allowedIds.length === 1) {
      return { departmentId: allowedIds[0], coerced: true }
    }
    return {
      error: 'Select a department you manage, or contact admin to link your HOD profile',
      status: 403,
    }
  }

  return { departmentId: requested }
}
