export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

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

  const body = await request.json().catch(() => ({}))
  let { embedding } = body

  if (!embedding) {
    throw new ApiError('embedding is required', 400)
  }

  if (Array.isArray(embedding)) {
    embedding = JSON.stringify(embedding)
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  })

  if (!student) {
    throw new ApiError('Student not found or unauthorized', 404)
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { faceEmbedding: embedding },
  })

  return NextResponse.json({ success: true, studentId })
})
