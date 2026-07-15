export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

/**
 * POST /api/marketplace/:id/download
 *
 * A teacher copies an approved shared material into their OWN school's library
 * (as a new DRAFT lesson plan). Increments the material's downloadCount.
 */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user.id)
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Invalid material id', 400)

  const material = await prisma.sharedMaterial.findFirst({
    where: { id, status: 'approved', schoolId: { not: '' } },
    select: {
      id: true,
      schoolId: true,
      type: true,
      title: true,
      subject: true,
      form: true,
      topic: true,
      content: true,
    },
  })
  if (!material) throw new ApiError('Material not found', 404)

  const c = material.content || {}

  // Currently the marketplace shares lesson plans; copy into the teacher's library.
  const plan = await prisma.lessonPlan.create({
    data: {
      schoolId,
      createdByUserId: userId,
      status: 'DRAFT',
      grade: String(c.grade || material.form || ''),
      subject: String(c.subject || material.subject || ''),
      topic: String(c.topic || material.topic || ''),
      subTopic: c.subTopic || null,
      duration: Number.isFinite(Number(c.duration)) ? Number(c.duration) : null,
      term: c.term || null,
      templateType: c.templateType || 'professional',
      content: String(c.content || ''),
      structuredContent: c.structuredContent ?? undefined,
    },
    select: { id: true, subject: true, topic: true, grade: true, status: true },
  })

  await prisma.sharedMaterial.updateMany({
    where: { id: material.id, schoolId: material.schoolId },
    data: { downloadCount: { increment: 1 } },
  })

  return NextResponse.json(
    { success: true, data: { lessonPlanId: plan.id, plan } },
    { status: 201 }
  )
})
