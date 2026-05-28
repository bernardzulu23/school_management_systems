export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export async function POST(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const assignment = await prisma.assignment.findFirst({
    where: { id: routeParams.id, schoolId },
  })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: assignment.id, schoolId },
    select: { grade: true },
  })
  const graded = submissions.filter((s) => Number.isFinite(Number(s.grade)))
  const averagePercentage =
    graded.length > 0
      ? Math.round(graded.reduce((sum, s) => sum + Number(s.grade || 0), 0) / graded.length)
      : 0

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      schoolId,
      action: 'SUBMIT_ASSESSMENT_TO_HOD',
      entity: 'Assignment',
      entityId: assignment.id,
      oldValue: null,
      newValue: {
        assignmentTitle: assignment.title,
        class: assignment.class,
        subject: assignment.subject,
        submissions: submissions.length,
        averagePercentage,
        submittedAt: new Date().toISOString(),
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      assignmentId: assignment.id,
      submissions: submissions.length,
      averagePercentage,
      message: 'Assessment submitted to HOD successfully',
    },
  })
}
