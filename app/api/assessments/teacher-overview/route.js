export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import {
  buildTeacherAssessmentOverview,
  resolvePublishedAssignmentId,
} from '@/lib/assessments/teacherOverview'

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
    const db = getTenantClient(schoolId)

    const assessments = await db.assessment.findMany({
      where: { schoolId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    const assignmentIds = [
      ...new Set(
        assessments
          .map((a) => resolvePublishedAssignmentId(a))
          .filter(Boolean)
          .map(String)
      ),
    ]

    const submissions =
      assignmentIds.length > 0
        ? await db.assignmentSubmission.findMany({
            where: {
              schoolId,
              assignmentId: { in: assignmentIds },
            },
            select: {
              assignmentId: true,
              studentId: true,
              grade: true,
              status: true,
            },
          })
        : []

    const overview = buildTeacherAssessmentOverview(assessments, submissions)

    return NextResponse.json({
      success: true,
      data: overview,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
