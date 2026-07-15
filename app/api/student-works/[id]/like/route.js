export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

/**
 * POST /api/student-works/[id]/like — increment likes on a school-scoped StudentWork.
 * Minimal v1: counter only (no per-user uniqueness table yet).
 */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (
    !roleCheck(auth.user, [
      'STUDENT',
      'student',
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const workId = await safeRouteParam(params, 'id')
  if (!workId) throw new ApiError('Invalid work id', 400)

  const existing = await prisma.studentWork.findFirst({
    where: { id: workId, schoolId },
    select: { id: true, likes: true },
  })
  if (!existing) throw new ApiError('Student work not found', 404)

  const updateResult = await prisma.studentWork.updateMany({
    where: { id: existing.id, schoolId },
    data: { likes: { increment: 1 } },
  })
  if (updateResult.count === 0) throw new ApiError('Student work not found', 404)

  const updated = await prisma.studentWork.findFirst({
    where: { id: existing.id, schoolId },
    select: { id: true, likes: true },
  })

  return NextResponse.json({
    success: true,
    data: { id: updated.id, likes: updated.likes },
  })
})
