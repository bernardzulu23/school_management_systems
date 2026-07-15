export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { MODERATION_STATUSES } from '@/lib/ecz/routeAuth'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Headteacher or HOD access required', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const statusRaw = safeQueryString(searchParams.get('status'), {
    defaultValue: 'PENDING',
  }).toUpperCase()
  const status = MODERATION_STATUSES.has(statusRaw) ? statusRaw : 'PENDING'

  const tasks = await prisma.eczAssessment.findMany({
    where: {
      schoolId,
      component: 'SBA_TASK',
      moderationStatus: status,
    },
    include: {
      subject: true,
      class: true,
      creator: { select: { id: true, name: true } },
      _count: { select: { scores: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ success: true, data: tasks })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Headteacher or HOD access required', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const assessmentId = safeStringId(body.assessmentId)
  const moderationStatus = safeQueryString(body.moderationStatus, { maxLength: 32 })?.toUpperCase()
  const moderationNotes = body.moderationNotes ? String(body.moderationNotes).slice(0, 2000) : null

  if (!assessmentId) throw new ApiError('assessmentId is required', 400)
  if (!moderationStatus || !MODERATION_STATUSES.has(moderationStatus)) {
    throw new ApiError('Invalid moderationStatus', 400)
  }

  const existing = await prisma.eczAssessment.findFirst({
    where: { id: assessmentId, schoolId },
  })
  if (!existing) throw new ApiError('Assessment not found', 404)

  const updateResult = await prisma.eczAssessment.updateMany({
    where: { id: assessmentId, schoolId },
    data: {
      moderationStatus,
      moderationNotes,
      moderatedBy: auth.user.id,
      moderatedAt: new Date(),
    },
  })
  if (updateResult.count === 0) throw new ApiError('Assessment not found', 404)

  const updated = await prisma.eczAssessment.findFirst({
    where: { id: assessmentId, schoolId },
  })

  return NextResponse.json({ success: true, data: updated })
})
