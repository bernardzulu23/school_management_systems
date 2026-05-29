export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { SubmitMaterialSchema } from '@/lib/schemas'
import { lessonPlanToContent } from '@/lib/marketplace'

/**
 * POST /api/marketplace/submit
 *
 * A teacher shares one of their own lesson plans to the marketplace. The content
 * is copied server-side from the teacher's record (the body only references it),
 * stored with status "pending", and an HOD/admin is notified to review.
 */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  const body = await parseBodyOrThrow(request, SubmitMaterialSchema)

  // Load the lesson plan, scoped to the teacher's own school AND authorship.
  const plan = await prisma.lessonPlan.findFirst({
    where: { id: body.lessonPlanId, schoolId, createdByUserId: userId },
  })
  if (!plan) throw new ApiError('Lesson plan not found or not owned by you', 404)

  // Prevent duplicate submissions of the same source plan.
  const existing = await prisma.sharedMaterial.findFirst({
    where: {
      sourceLessonPlanId: plan.id,
      teacherId: userId,
      status: { in: ['pending', 'approved'] },
    },
    select: { id: true, status: true },
  })
  if (existing) {
    throw new ApiError(`This lesson plan is already ${existing.status} in the marketplace`, 409)
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { province: true },
  })

  const material = await prisma.sharedMaterial.create({
    data: {
      schoolId,
      teacherId: userId,
      sourceLessonPlanId: plan.id,
      type: 'lesson_plan',
      title: `${plan.subject} • ${plan.topic}`.slice(0, 200),
      subject: plan.subject,
      form: plan.grade,
      topic: plan.topic,
      content: lessonPlanToContent(plan),
      cbcCompetencies: [],
      resourceLevel: 'moderate',
      tags: Array.isArray(body.tags) ? body.tags : [],
      showAuthorName: Boolean(body.showAuthorName),
      province: school?.province || null,
      status: 'pending',
    },
    select: { id: true, status: true, title: true, subject: true, form: true },
  })

  // Notify an HOD/headteacher in the school to review (best-effort).
  try {
    const reviewer = await prisma.user.findFirst({
      where: { schoolId, role: { in: ['hod', 'HOD', 'headteacher', 'admin', 'ADMIN'] } },
      select: { id: true },
    })
    if (reviewer?.id) {
      await prisma.timetableNotification.create({
        data: {
          schoolId,
          fromUserId: userId,
          toUserId: reviewer.id,
          type: 'marketplace_submission',
          title: 'New Marketplace Submission',
          message: `${material.subject} • ${material.form} • ${material.title}`,
          meta: { sharedMaterialId: material.id },
        },
      })
    }
  } catch {
    // Notification is non-blocking.
  }

  return NextResponse.json({ success: true, data: material }, { status: 201 })
})
