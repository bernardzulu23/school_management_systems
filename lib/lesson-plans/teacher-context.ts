import prisma from '@/lib/prisma'
import { resolveDepartmentForSubject } from '@/lib/lesson-plans/subject-department'

/** Safe teacher/school fields for lesson plan headers — no phone, DOB, or email. */
export type LessonPlanTeacherContext = {
  teacherName: string
  teacherGender: string | null
  employeeId: string | null
  department: string | null
  specialization: string | null
  qualifications: string | null
  schoolName: string
  schoolAddress: string | null
  academicYear: string | null
}

function formatGender(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'm' || lower === 'male') return 'Male'
  if (lower === 'f' || lower === 'female') return 'Female'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export async function getLessonPlanTeacherContext(
  userId: string,
  schoolId: string,
  subject?: string
): Promise<LessonPlanTeacherContext> {
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId },
    select: {
      name: true,
      gender: true,
      employeeId: true,
      school: {
        select: {
          name: true,
          address: true,
          academicYear: true,
        },
      },
      teacherProfile: {
        select: {
          department: true,
          specialization: true,
          qualifications: true,
          departments: {
            take: 1,
            select: { department: { select: { name: true } } },
          },
        },
      },
    },
  })

  const profile = user?.teacherProfile
  const linkedDept = profile?.departments?.[0]?.department?.name
  const department =
    linkedDept || profile?.department || resolveDepartmentForSubject(subject) || null

  return {
    teacherName: String(user?.name || 'Teacher').trim() || 'Teacher',
    teacherGender: formatGender(user?.gender),
    employeeId: user?.employeeId?.trim() || null,
    department,
    specialization: profile?.specialization?.trim() || null,
    qualifications: profile?.qualifications?.trim() || null,
    schoolName: String(user?.school?.name || 'School').trim() || 'School',
    schoolAddress: user?.school?.address?.trim() || null,
    academicYear: user?.school?.academicYear?.trim() || null,
  }
}
