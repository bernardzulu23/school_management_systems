/** Lightweight list of SBA score rows for evidence upload picker. */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withSecureApi } from '@/lib/middleware/secureApi'

const CAN_ACCESS = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const GET = withSecureApi(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_ACCESS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const academicYear = searchParams.get('academicYear')
    ? parseInt(searchParams.get('academicYear'), 10)
    : new Date().getFullYear()
  const formLevel = searchParams.get('formLevel')
    ? parseInt(searchParams.get('formLevel'), 10)
    : undefined

  try {
    const scores = await prisma.eczAssessmentScore.findMany({
      where: {
        schoolId,
        academicYear,
        formLevel: formLevel ?? { not: 4 },
        totalSBAScore: { gt: 0 },
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
  } catch (error) {
    console.error('ECZ scores list:', error)
    return NextResponse.json({ error: 'Failed to load scores' }, { status: 500 })
  }
})
