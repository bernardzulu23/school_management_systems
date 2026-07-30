import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { basePrisma } from '@/lib/prisma/client'
import { listOfficialPrimaryResources } from '@/lib/curriculum/officialPrimaryResources'
import { hasPrimaryClasses } from '@/lib/school/schoolTypeHelpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/curriculum/primary-resources
 * Official CDC primary syllabi, teaching modules, and ECE resources.
 * Available to every primary (and combined) school — not tenant Study Materials.
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

  if (!hasPrimaryClasses(school)) {
    return NextResponse.json(
      { error: 'Official primary resources are only available for primary or combined schools' },
      { status: 403 }
    )
  }

  const data = listOfficialPrimaryResources({ includeEce: true })
  return NextResponse.json({
    success: true,
    data,
    meta: { schoolLevel: school?.level || null, eceVisibleToAllPrimary: true },
  })
})
