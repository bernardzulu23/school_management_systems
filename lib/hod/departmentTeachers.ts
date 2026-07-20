/**
 * Shared HOD department teacher scoping (reuse for coverage / lesson-plan drilldown).
 */
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

export type HodDepartmentTeachersResult = {
  teacherUserIds: string[]
  departmentIds: string[]
  departmentNameAliases: string[]
}

/**
 * Resolve User.id list for teachers in the HOD's department (school-scoped).
 * Returns empty arrays when the HOD profile is missing or has no department link.
 */
export async function getHodDepartmentTeacherUserIds(
  prisma: {
    headOfDepartment: { findFirst: Function }
    teacher: { findMany: Function }
  },
  schoolId: string,
  hodUserId: string
): Promise<HodDepartmentTeachersResult> {
  if (!schoolId || !hodUserId) {
    return { teacherUserIds: [], departmentIds: [], departmentNameAliases: [] }
  }

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: hodUserId, schoolId },
    include: { departmentRef: { select: { id: true, name: true } } },
  })

  if (!hodProfile) {
    return { teacherUserIds: [], departmentIds: [], departmentNameAliases: [] }
  }

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.departmentRef?.name || hodProfile.department,
  })

  const departmentIds = Array.from(new Set((resolved.departmentIds || []).map(String)))
  const departmentNameAliases = resolved.departmentNameAliases || []

  if (departmentIds.length === 0 && departmentNameAliases.length === 0) {
    return { teacherUserIds: [], departmentIds, departmentNameAliases }
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      OR: [
        ...(departmentIds.length > 0
          ? [{ departments: { some: { departmentId: { in: departmentIds } } } }]
          : []),
        ...departmentNameAliases.map((n: string) => ({
          department: { equals: String(n), mode: 'insensitive' as const },
        })),
      ],
    },
    select: { userId: true },
  })

  const teacherUserIds = teachers
    .map((t: { userId: string | null }) => t.userId)
    .filter(Boolean) as string[]

  return { teacherUserIds, departmentIds, departmentNameAliases }
}

/** True when teacherUserId is in the HOD's department for this school. */
export async function assertTeacherInHodDepartment(
  prisma: {
    headOfDepartment: { findFirst: Function }
    teacher: { findMany: Function }
  },
  schoolId: string,
  hodUserId: string,
  teacherUserId: string
): Promise<boolean> {
  const { teacherUserIds } = await getHodDepartmentTeacherUserIds(prisma, schoolId, hodUserId)
  return teacherUserIds.includes(String(teacherUserId))
}
