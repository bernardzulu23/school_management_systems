export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'

/** Use ROLE_ALIASES keys so headteacher/deputy/guidance match correctly. */
const STAFF_ROLES = [
  'ADMIN',
  'HOD',
  'TEACHER',
  'DEPUTY',
  'SENIOR_TEACHER',
  'GUIDANCE_TEACHER',
  'headteacher',
  'teacher',
  'hod',
]

const ASSIGNMENT_LIMIT = 100

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, STAFF_ROLES)) {
    // Keep authenticated staff in the app — return empty load instead of 403 kick-out.
    const role = String(auth.user?.role || '').toLowerCase()
    if (role && role !== 'student' && role !== 'parent') {
      const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
      if (!tenant.ok) return tenant.response
      const schoolId = tenant.schoolId
      const [dbUser, school] = await Promise.all([
        prisma.user.findFirst({
          where: { id: auth.user.id, schoolId: schoolId || undefined },
          select: { id: true, name: true, role: true },
        }),
        schoolId
          ? prisma.school.findFirst({
              where: { id: schoolId },
              select: { name: true, logo_url: true },
            })
          : Promise.resolve(null),
      ])
      return NextResponse.json({
        user: {
          id: dbUser?.id || auth.user.id,
          name: dbUser?.name || auth.user.name || 'Staff',
          role: dbUser?.role || auth.user.role,
        },
        school: {
          name: school?.name || null,
          logoUrl: school?.logo_url || null,
        },
        assignments: [],
      })
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const [dbUser, school] = await Promise.all([
    prisma.user.findFirst({
      where: { id: auth.user.id, schoolId },
      select: { id: true, name: true, role: true },
    }),
    prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true, logo_url: true },
    }),
  ])

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Any staff with a Teacher profile can have a load (not only role=TEACHER).
  const teacher = await prisma.teacher.findFirst({
    where: { userId: dbUser.id, schoolId },
    include: {
      user: { select: { id: true, name: true } },
      classes: { take: 50 },
      subjects: { take: 50 },
      teachingAssignments: {
        where: { schoolId },
        include: { class: true, subject: true },
        take: ASSIGNMENT_LIMIT,
      },
    },
  })

  let assignments = []
  if (teacher) {
    const { assignments: load } = await resolveTeacherLoad({ schoolId, teacher })
    assignments = load.slice(0, ASSIGNMENT_LIMIT).map((a) => ({
      id: String(a.id),
      classId: a.classId,
      className: a.class?.name || null,
      subjectId: a.subjectId,
      subjectName: a.subject?.name || null,
    }))
  }

  return NextResponse.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      role: dbUser.role,
    },
    school: {
      name: school?.name || null,
      logoUrl: school?.logo_url || null,
    },
    assignments,
  })
})
