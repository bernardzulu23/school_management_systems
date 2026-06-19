import prisma from '@/lib/prisma'

export async function listSiblingGroups(schoolId) {
  return prisma.siblingGroup.findMany({
    where: { schoolId },
    include: {
      members: {
        include: { student: { select: { id: true, name: true, class: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createSiblingGroup(schoolId, { studentIds, discount }) {
  const ids = Array.isArray(studentIds) ? studentIds.map(String) : []
  if (ids.length < 2) {
    throw new Error('At least 2 studentIds required')
  }

  const students = await prisma.student.findMany({
    where: { id: { in: ids }, schoolId },
    select: { id: true },
  })
  if (students.length !== ids.length) {
    throw new Error('One or more students not found in this school')
  }

  return prisma.siblingGroup.create({
    data: {
      schoolId,
      discount: Number(discount ?? 0.1),
      members: {
        create: ids.map((studentId) => ({ studentId, schoolId })),
      },
    },
    include: {
      members: { include: { student: { select: { name: true, class: true } } } },
    },
  })
}
