export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'

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
  const status = String(searchParams.get('status') || 'PENDING').toUpperCase()

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
  const assessmentId = String(body.assessmentId || '').trim()
  const moderationStatus = String(body.moderationStatus || '').toUpperCase()
  const moderationNotes = body.moderationNotes ? String(body.moderationNotes) : null

  if (!assessmentId) throw new ApiError('assessmentId is required', 400)
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(moderationStatus)) {
    throw new ApiError('Invalid moderationStatus', 400)
  }

  const existing = await prisma.eczAssessment.findFirst({
    where: { id: assessmentId, schoolId },
  })
  if (!existing) throw new ApiError('Assessment not found', 404)

  const updated = await prisma.eczAssessment.update({
    where: { id: assessmentId },
    data: {
      moderationStatus,
      moderationNotes,
      moderatedBy: auth.user.id,
      moderatedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
