export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import {
  assertSchoolFacialAttendanceEnabled,
  assertActiveFacialConsent,
  sanitizeFaceEmbeddingPayload,
} from '@/lib/consent/facialAttendance'
import { recordChangeLog, actorFromUser } from '@/lib/changelog/record'
import { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } from '@/lib/changelog/constants'

/**
 * POST — store derived face embedding only (never raw images).
 * Requires: school facialAttendanceEnabled + active ConsentRecord for pupil.
 */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'TEACHER', 'teacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const studentId = await safeRouteParam(params, 'id')
  if (!studentId) throw new ApiError('Student id is required', 400)

  try {
    await assertSchoolFacialAttendanceEnabled(schoolId)
    await assertActiveFacialConsent(schoolId, studentId)
  } catch (e) {
    const err = new ApiError(e.message || 'Forbidden', e.status || 403)
    err.code = e.code
    throw err
  }

  const body = await request.json().catch(() => ({}))
  let embeddingJson
  try {
    embeddingJson = sanitizeFaceEmbeddingPayload(body.embedding)
  } catch (e) {
    const err = new ApiError(e.message || 'Invalid embedding', e.status || 400)
    err.code = e.code
    throw err
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, name: true, enrollmentStatus: true },
  })

  if (!student) {
    throw new ApiError('Student not found or unauthorized', 404)
  }

  if (String(student.enrollmentStatus || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    const err = new ApiError(
      'Cannot enrol face for a pupil who has left the school. Clear enrollmentStatus to ACTIVE first.',
      400
    )
    err.code = 'PUPIL_NOT_ACTIVE'
    throw err
  }

  const updateResult = await prisma.student.updateMany({
    where: { id: studentId, schoolId },
    data: {
      faceEmbedding: embeddingJson,
      faceEmbeddingEnrolledAt: new Date(),
    },
  })
  if (updateResult.count === 0) {
    throw new ApiError('Student not found or unauthorized', 404)
  }

  const a = actorFromUser(auth.user)
  await recordChangeLog({
    schoolId,
    actor: a,
    action: CHANGE_LOG_ACTIONS.UPDATED,
    module: CHANGE_LOG_MODULES.PRIVACY,
    entityType: 'Student',
    entityId: studentId,
    entityLabel: student.name,
    summary: `${buildActorLabel(a)} enrolled facial template for ${student.name} (embedding only; consent on file)`,
    metadata: { pupilId: studentId, artifact: 'faceEmbedding' },
  })

  return NextResponse.json({ success: true, studentId })
})

/**
 * DELETE — clear face template (manual admin / teacher). Does not withdraw consent.
 */
export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'TEACHER', 'teacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const studentId = await safeRouteParam(params, 'id')
  if (!studentId) throw new ApiError('Student id is required', 400)

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, name: true },
  })
  if (!student) throw new ApiError('Student not found', 404)

  const updateResult = await prisma.student.updateMany({
    where: { id: studentId, schoolId },
    data: { faceEmbedding: null, faceEmbeddingEnrolledAt: null },
  })
  if (updateResult.count === 0) throw new ApiError('Student not found', 404)

  const a = actorFromUser(auth.user)
  await recordChangeLog({
    schoolId,
    actor: a,
    action: CHANGE_LOG_ACTIONS.DELETED,
    module: CHANGE_LOG_MODULES.PRIVACY,
    entityType: 'Student',
    entityId: studentId,
    entityLabel: student.name,
    summary: `${buildActorLabel(a)} cleared facial template for ${student.name}`,
    metadata: { pupilId: studentId },
  })

  return NextResponse.json({ success: true })
})
