export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { setSchoolFacialAttendanceSettings } from '@/lib/consent/consentService'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['ADMIN', 'headteacher', 'ADMINISTRATOR']

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      facialAttendanceEnabled: true,
      faceEmbeddingRetentionDays: true,
      name: true,
    },
  })
  return NextResponse.json({ success: true, school })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  try {
    const school = await setSchoolFacialAttendanceSettings({
      schoolId,
      facialAttendanceEnabled: body.facialAttendanceEnabled,
      faceEmbeddingRetentionDays: body.faceEmbeddingRetentionDays,
      actorUser: auth.user,
    })
    return NextResponse.json({ success: true, school })
  } catch (e) {
    throw new ApiError(e.message || 'Failed', e.status || 400)
  }
})
