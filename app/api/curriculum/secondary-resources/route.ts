import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { basePrisma } from '@/lib/prisma/client'
import { listOfficialSecondaryResources } from '@/lib/curriculum/officialPrimaryResources'
import { hasSecondaryClasses } from '@/lib/school/schoolTypeHelpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/curriculum/secondary-resources
 * Official MoE secondary teaching modules (form-tagged JSON under data/teaching-modules).
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (
    !roleCheck(user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'SENIOR_TEACHER',
      'senior_teacher',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response

  const school = await basePrisma.school.findUnique({
    where: { id: tenant.schoolId },
    select: { level: true },
  })

  if (!hasSecondaryClasses(school)) {
    return NextResponse.json(
      {
        error:
          'Official secondary teaching modules are only available for secondary or combined schools',
      },
      { status: 403 }
    )
  }

  const data = listOfficialSecondaryResources()
  return NextResponse.json({
    success: true,
    data,
    meta: { schoolLevel: school?.level || null },
  })
})
