export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  listFacialConsentForSchool,
  grantFacialConsent,
  denyFacialConsent,
} from '@/lib/consent/consentService'
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

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId') || undefined
  const q = searchParams.get('q') || undefined

  const [school, rows, classes] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        facialAttendanceEnabled: true,
        faceEmbeddingRetentionDays: true,
        name: true,
      },
    }),
    listFacialConsentForSchool(schoolId, { classId, q }),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  ])

  return NextResponse.json({
    success: true,
    school,
    classes,
    students: rows,
  })
})

/** Record consent grant or denial (paper form digitised). */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const pupilId = String(body.pupilId || '').trim()
  if (!pupilId) throw new ApiError('pupilId is required', 400)

  const decision = String(body.decision || 'grant').toLowerCase()
  const payload = {
    schoolId,
    pupilId,
    grantedByName: body.grantedByName,
    grantedByRelationship: body.grantedByRelationship,
    grantedByContact: body.grantedByContact,
    method: body.method || 'PAPER_FORM',
    notes: body.notes,
    actorUser: auth.user,
    grantedAt: body.grantedAt,
  }

  try {
    const record =
      decision === 'deny' ? await denyFacialConsent(payload) : await grantFacialConsent(payload)
    return NextResponse.json({ success: true, data: record })
  } catch (e) {
    throw new ApiError(e.message || 'Failed', e.status || 400)
  }
})
