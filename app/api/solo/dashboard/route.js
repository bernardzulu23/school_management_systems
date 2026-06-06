export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { requireSoloTeacher } from '@/lib/solo/requireSoloTeacher'
import { INDIVIDUAL_STUDENT_LIMIT } from '@/lib/billing/plan-pricing'
import { getSubscriptionState } from '@/lib/billing/subscription'

export const GET = withSecureApi(async function GET(request) {
  const gate = await requireSoloTeacher(request)
  if (!gate.ok) return gate.response

  const [lessonPlanCount, studentCount, materialCount, assessmentCount, school, recentPlans] =
    await Promise.all([
      prisma.lessonPlan.count({ where: { schoolId: gate.schoolId } }),
      prisma.user.count({
        where: { schoolId: gate.schoolId, role: { equals: 'student', mode: 'insensitive' } },
      }),
      prisma.schoolMaterial.count({ where: { schoolId: gate.schoolId } }),
      prisma.eczAssessment.count({ where: { schoolId: gate.schoolId } }),
      prisma.school.findUnique({
        where: { id: gate.schoolId },
        select: {
          plan: true,
          enrollmentCode: true,
          subdomain: true,
          name: true,
          planExpiresAt: true,
          trialEndsAt: true,
        },
      }),
      prisma.lessonPlan.findMany({
        where: { schoolId: gate.schoolId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          subject: true,
          grade: true,
          topic: true,
          status: true,
          updatedAt: true,
        },
      }),
    ])

  const plan = String(school?.plan || 'individual_free').toLowerCase()
  const studentLimit = INDIVIDUAL_STUDENT_LIMIT[plan] ?? 5

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        lessonPlans: lessonPlanCount,
        students: studentCount,
        studentLimit: studentLimit === Infinity ? null : studentLimit,
        materials: materialCount,
        assessments: assessmentCount,
      },
      school: {
        ...school,
        subscription: getSubscriptionState(school),
      },
      recentLessonPlans: recentPlans,
    },
  })
})
