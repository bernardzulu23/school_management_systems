import prisma from '@/lib/prisma'

export function parseGradeCategory(grade) {
  const raw = String(grade || '')
    .trim()
    .toLowerCase()
  const m = raw.match(/grade\s*(\d{1,2})/)
  if (m) {
    const n = Number(m[1])
    if (n >= 1 && n <= 7) return 'primary'
    return 'secondary'
  }
  if (raw.includes('ece') || raw.includes('reception')) return 'primary'
  if (raw.startsWith('form')) return 'secondary'
  return 'secondary'
}

const PRIMARY_REVIEWER_ROLES = [
  'seniorteacher',
  'senior_teacher',
  'senior-teacher',
  'senior teacher',
  'deputyheadteacher',
  'deputyhead',
  'deputy_head',
  'deputy-head',
  'deputy head',
  'deputy head teacher',
]

/**
 * Resolve reviewer User.id for lesson plan approval.
 * - Secondary / Form grades → HOD (then headteacher)
 * - Primary (Grade 1–7 / ECE) → Senior teacher or Deputy, then headteacher
 */
export async function resolveReviewerUserId({ schoolId, teacherUserId, grade, subject }) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { level: true },
  })
  const gradeCategory = parseGradeCategory(grade)
  const isPrimary =
    String(school?.level || '').toLowerCase() === 'primary' || gradeCategory === 'primary'

  if (isPrimary) {
    const candidates = await prisma.user.findMany({
      where: { schoolId },
      select: { id: true, role: true },
      take: 200,
    })
    const normalized = new Set(PRIMARY_REVIEWER_ROLES.map((r) => r.replace(/[^a-z0-9]/g, '')))
    const match = candidates.find((u) =>
      normalized.has(
        String(u.role || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      )
    )
    if (match?.id) return match.id

    // Primary schools: fall back to headteacher (no HOD UI)
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

  // Secondary: HOD path
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
