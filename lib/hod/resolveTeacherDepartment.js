import prisma from '@/lib/prisma'

/**
 * Resolve canonical department id for a teacher in a school.
 * @param {string} schoolId
 * @param {string} userId
 */
export async function resolveTeacherDepartmentId(schoolId, userId) {
  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId },
    include: {
      departments: { include: { department: { select: { id: true, name: true } } } },
    },
  })
  if (!teacher) return { teacher: null, departmentId: null, departmentName: null }

  const joined = teacher.departments?.[0]?.department
  if (joined?.id) {
    return {
      teacher,
      departmentId: joined.id,
      departmentName: joined.name,
    }
  }

  if (teacher.department) {
    const dept = await prisma.department.findFirst({
      where: {
        schoolId,
        name: { equals: String(teacher.department), mode: 'insensitive' },
      },
      select: { id: true, name: true },
    })
    if (dept) {
      return { teacher, departmentId: dept.id, departmentName: dept.name }
    }
  }

  return { teacher, departmentId: null, departmentName: teacher.department || null }
}
