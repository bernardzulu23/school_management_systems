export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { isPlatformToken } from '@/lib/middleware/platformAuth'
import { resolvePlatformAdminRecord } from '@/lib/platform/platformAdminAuth'
import prisma from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { hydrateLegacySchoolAccess } from '@/lib/billing/subscription'

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (isPlatformToken(auth.user)) {
    const record = await resolvePlatformAdminRecord(auth.user)
    return NextResponse.json({
      success: true,
      user: {
        id: record?.id || auth.user.id,
        email: record?.email || auth.user.email,
        name: record?.name || auth.user.name || 'Platform Super Admin',
        role: 'superadmin',
        isPlatform: true,
        hasDbProfile: Boolean(record),
      },
    })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
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
      guidanceAssignment: {
        select: {
          id: true,
          scope: true,
          assignedAt: true,
          active: true,
          revokedAt: true,
          canManageReEntry: true,
        },
      },
    },
  })

  if (!dbUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      logo_url: true,
      subdomain: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      emailVerified: true,
      active: true,
      schoolType: true,
      level: true,
    },
  })

  const hydratedSchool = school ? await hydrateLegacySchoolAccess(prisma, schoolId, school) : null

  const resolvedDepartment =
    dbUser.hodProfile?.departmentRef?.name ||
    dbUser.hodProfile?.department ||
    dbUser.teacherProfile?.departments?.[0]?.department?.name ||
    dbUser.teacherProfile?.department ||
    undefined

  return NextResponse.json({
    success: true,
    school: hydratedSchool
      ? {
          id: hydratedSchool.id,
          name: hydratedSchool.name,
          logo_url: hydratedSchool.logo_url,
          subdomain: hydratedSchool.subdomain,
          plan: hydratedSchool.plan,
          emailVerified: hydratedSchool.emailVerified,
          schoolType: hydratedSchool.schoolType,
          level: hydratedSchool.level,
        }
      : null,
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
      guidanceAssignment:
        dbUser.guidanceAssignment?.active && !dbUser.guidanceAssignment?.revokedAt
          ? {
              id: dbUser.guidanceAssignment.id,
              scope: dbUser.guidanceAssignment.scope,
              assignedAt: dbUser.guidanceAssignment.assignedAt,
              active: dbUser.guidanceAssignment.active,
              canManageReEntry: dbUser.guidanceAssignment.canManageReEntry,
            }
          : undefined,
    },
  })
})
