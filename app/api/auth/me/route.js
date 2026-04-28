export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const dbUser = await prisma.user.findFirst({
    where: { id: auth.user.id, schoolId },
    include: {
      studentProfile: true,
      teacherProfile: {
        include: {
          classes: true,
          teachingAssignments: { include: { class: true, subject: true } },
          departments: { include: { department: true } },
        },
      },
      hodProfile: { include: { departmentRef: true } },
    },
  })

  if (!dbUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { id: true, name: true, logo_url: true, subdomain: true },
  })

  const resolvedDepartment =
    dbUser.hodProfile?.departmentRef?.name ||
    dbUser.hodProfile?.department ||
    dbUser.teacherProfile?.departments?.[0]?.department?.name ||
    dbUser.teacherProfile?.department ||
    undefined

  return NextResponse.json({
    success: true,
    school: school || null,
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      schoolId: dbUser.schoolId,
      profile_picture_url: dbUser.profile_picture_url,
      contact_number: dbUser.contact_number,
      address: dbUser.address,
      date_of_birth: dbUser.date_of_birth,
      gender: dbUser.gender,
      employeeId: dbUser.employeeId,
      department: resolvedDepartment,
      studentProfile: dbUser.studentProfile || undefined,
      teacherProfile: dbUser.teacherProfile || undefined,
      hodProfile: dbUser.hodProfile || undefined,
    },
  })
}
