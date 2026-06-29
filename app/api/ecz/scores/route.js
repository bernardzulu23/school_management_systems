/** Lightweight list of SBA score rows for evidence upload picker. */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { isEczStaff } from '@/lib/ecz/routeAuth'

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczStaff(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const yearRaw = safeQueryString(searchParams.get('academicYear'))
  const academicYear =
    yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : new Date().getFullYear()
  const formRaw = safeQueryString(searchParams.get('formLevel'))
  const formLevel = formRaw && Number.isFinite(Number(formRaw)) ? Number(formRaw) : undefined

  const scores = await prisma.eczAssessmentScore.findMany({
    where: {
      schoolId,
      academicYear,
      ...(formLevel != null ? { formLevel } : { formLevel: { not: 4 } }),
      OR: [
        { totalSBAScore: { gt: 0 } },
        { task1Score: { gt: 0 } },
        { task2Score: { gt: 0 } },
        { task3Score: { gt: 0 } },
        { termTestScore: { gt: 0 } },
      ],
    },
    include: {
      student: { select: { id: true, name: true, exam_number: true, class: true } },
      assessment: {
        include: { subject: { select: { name: true } } },
      },
      evidenceFiles: { select: { id: true } },
    },
    orderBy: [{ student: { name: 'asc' } }],
    take: 500,
  })

  return NextResponse.json({
    success: true,
    data: scores.map((s) => ({
      id: s.id,
      label: `${s.student.name} — ${s.assessment.subject.name} (Form ${s.formLevel}) · ${s.totalSBAScore}/100`,
      studentId: s.studentId,
      learnerName: s.student.name,
      learnerNumber: s.student.exam_number,
      className: s.student.class,
      subject: s.assessment.subject.name,
      formLevel: s.formLevel,
      totalSBAScore: s.totalSBAScore,
      evidenceCount: s.evidenceFiles.length,
    })),
  })
})
