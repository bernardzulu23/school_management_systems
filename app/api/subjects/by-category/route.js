export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { basePrisma } from '@/lib/prisma/client'
import { resolveSubjectCatalog, getSubjectLimits } from '@/lib/subjects/resolveSubjectCatalog'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const { searchParams } = new URL(request.url)
  const gradeLevel =
    safeQueryString(searchParams.get('gradeLevel')) ||
    safeQueryString(searchParams.get('grade')) ||
    null
  let schoolLevel = safeQueryString(searchParams.get('schoolLevel'))
  let enabledLocalLanguages = null

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (tenant.ok && tenant.schoolId) {
    const school = await basePrisma.school.findUnique({
      where: { id: tenant.schoolId },
      select: { level: true, enabledLocalLanguages: true },
    })
    if (school) {
      schoolLevel = school.level
      enabledLocalLanguages = school.enabledLocalLanguages
    }
  }

  const catalog = resolveSubjectCatalog({
    schoolLevel: schoolLevel || 'combined',
    gradeLevel,
    enabledLocalLanguages,
  })
  const limits = getSubjectLimits(catalog.educationLevel)

  return NextResponse.json({
    success: true,
    data: catalog.grouped,
    meta: {
      educationLevel: catalog.educationLevel,
      schoolLevel: schoolLevel || 'combined',
      limits,
      categories: catalog.categories,
    },
  })
})
