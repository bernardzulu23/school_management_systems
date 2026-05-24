import prisma from '@/lib/prisma'

function parseGradeCategory(grade) {
  const raw = String(grade || '')
    .trim()
    .toLowerCase()
  const m = raw.match(/grade\s*(\d{1,2})/)
  if (m) {
    const n = Number(m[1])
    if (n >= 1 && n <= 7) return 'primary'
    return 'secondary'
  }
  if (raw.startsWith('form')) return 'secondary'
  return 'secondary'
}

/** Resolve HOD (or headteacher fallback) User.id for lesson plan review. */
export async function resolveReviewerUserId({ schoolId, teacherUserId, grade, subject }) {
  const category = parseGradeCategory(grade)

  if (category === 'primary') {
    const primaryHod = await prisma.headOfDepartment.findFirst({
      where: {
        schoolId,
        OR: [
          { department: { contains: 'primary', mode: 'insensitive' } },
          { department: { contains: 'lower', mode: 'insensitive' } },
          { department: { contains: 'basic', mode: 'insensitive' } },
          { departmentRef: { name: { contains: 'primary', mode: 'insensitive' } } },
          { departmentRef: { name: { contains: 'lower', mode: 'insensitive' } } },
          { departmentRef: { name: { contains: 'basic', mode: 'insensitive' } } },
        ],
      },
      select: { userId: true },
    })
    if (primaryHod?.userId) return primaryHod.userId
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: teacherUserId },
    select: {
      department: true,
      departments: { select: { departmentId: true, department: { select: { name: true } } } },
    },
  })

  const deptId = teacher?.departments?.[0]?.departmentId || null
  let deptName = teacher?.departments?.[0]?.department?.name || teacher?.department || null

  if (!deptName && subject) {
    const sub = String(subject).split('(')[0].trim()
    if (sub) deptName = sub
  }

  const hod = await prisma.headOfDepartment.findFirst({
    where: {
      schoolId,
      OR: [
        ...(deptId ? [{ departmentId: deptId }] : []),
        ...(deptName
          ? [
              { department: { equals: String(deptName), mode: 'insensitive' } },
              { departmentRef: { name: { equals: String(deptName), mode: 'insensitive' } } },
              { department: { contains: String(deptName), mode: 'insensitive' } },
              { departmentRef: { name: { contains: String(deptName), mode: 'insensitive' } } },
            ]
          : []),
      ],
    },
    select: { userId: true },
  })
  if (hod?.userId) return hod.userId

  const head = await prisma.user.findFirst({
    where: {
      schoolId,
      role: { in: ['headteacher', 'HEADTEACHER', 'admin', 'ADMIN'] },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return head?.id || null
}
