export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { toAttemptSummary } from '@/lib/mock-exam'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'mock-exams')
  if (typeBlock) return typeBlock

  const db = getTenantClient(schoolId)

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const attempts = await db.mockExamAttempt.findMany({
    where: { schoolId, studentId: student.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({
    success: true,
    data: attempts.map(toAttemptSummary),
  })
})
