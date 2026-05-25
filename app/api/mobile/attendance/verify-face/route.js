export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getEnrolledRoster } from '@/lib/attendance/sessions'
import {
  findBestFaceMatch,
  FACE_MATCH_THRESHOLD,
  FACE_L2_THRESHOLD,
  MOBILE_FACE_EMBEDDING_DIM,
} from '@/lib/face/match'
import prisma from '@/lib/prisma'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const sessionId = String(body.sessionId || '').trim()
  const probeEmbedding = body.probeEmbedding

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId, status: 'OPEN' },
    select: { classId: true, subjectId: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Session not found or closed' }, { status: 404 })
  }

  const roster = await getEnrolledRoster(schoolId, session.classId, session.subjectId)
  let parsedProbe = probeEmbedding
  if (typeof probeEmbedding === 'string') {
    try {
      parsedProbe = JSON.parse(probeEmbedding)
    } catch {
      parsedProbe = probeEmbedding
    }
  }

  const match = findBestFaceMatch(parsedProbe, roster, FACE_MATCH_THRESHOLD, FACE_L2_THRESHOLD)

  if (!match) {
    return NextResponse.json(
      { success: false, error: 'Face not recognised', code: 'FACE_NOT_RECOGNISED' },
      { status: 404 }
    )
  }

  const student = roster.find((s) => s.id === match.studentId)
  return NextResponse.json({
    success: true,
    data: {
      studentId: match.studentId,
      name: match.name,
      score: match.score,
      threshold:
        Array.isArray(parsedProbe) && parsedProbe.length === MOBILE_FACE_EMBEDDING_DIM
          ? FACE_L2_THRESHOLD
          : FACE_MATCH_THRESHOLD,
      metric:
        Array.isArray(parsedProbe) && parsedProbe.length === MOBILE_FACE_EMBEDDING_DIM
          ? 'l2'
          : 'cosine',
      twinGroupId: student?.twinGroupId || null,
      requiresSecondaryAuth: Boolean(student?.requiresSecondaryAuth),
      secondaryAuthMethod: student?.secondaryAuthMethod || null,
    },
  })
})
