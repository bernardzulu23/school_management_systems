export const dynamic = 'force-dynamic'

import { withApiHandler, apiOk, ApiError } from '@/lib/middleware/withApiHandler'
import { isPlatformToken } from '@/lib/middleware/platformAuth'
import { resolvePlatformAdminRecord } from '@/lib/platform/platformAdminAuth'
import prisma from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant/context'
import { hydrateLegacySchoolAccess } from '@/lib/billing/subscription'

/**
 * GET /api/auth/me — Phase 3 example (auth domain).
 * tenant: false — platform tokens have no school; school users resolve tenant inside.
 */
export const GET = withApiHandler(
  async ({ request, user }) => {
    if (isPlatformToken(user)) {
      const record = await resolvePlatformAdminRecord(user)
      return apiOk({
        user: {
          id: record?.id || user.id,
          email: record?.email || user.email,
          name: record?.name || user.name || 'Platform Super Admin',
          role: 'superadmin',
          isPlatform: true,
          hasDbProfile: Boolean(record),
        },
      })
    }

    const tenant = await getTenantContext(request, user)
    if (!tenant.ok) return tenant.response
    const { schoolId } = tenant

    const dbUser = await prisma.user.findFirst({
      where: { id: user.id, schoolId },
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
        sicAssignment: {
          select: {
            id: true,
            assignedAt: true,
            active: true,
            revokedAt: true,
          },
        },
      },
    })

    if (!dbUser) {
      throw new ApiError('Unauthorized', 401, { code: 'UNAUTHORIZED' })
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

    return apiOk({
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
        isHod: Boolean(dbUser.hodProfile),
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
        sicAssignment:
          dbUser.sicAssignment?.active && !dbUser.sicAssignment?.revokedAt
            ? {
                id: dbUser.sicAssignment.id,
                assignedAt: dbUser.sicAssignment.assignedAt,
                active: dbUser.sicAssignment.active,
              }
            : undefined,
      },
    })
  },
  { tenant: false }
)
