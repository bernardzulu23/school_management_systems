export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'

const LEVEL_SCORE = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  NEEDS_IMPROVEMENT: 1,
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const { searchParams } = new URL(request.url)
  const academicYear = Number(searchParams.get('academicYear') || new Date().getFullYear())
  const term = searchParams.get('term') ? Number(searchParams.get('term')) : undefined
  const gradeLevel = searchParams.get('gradeLevel') || undefined

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, eczCentreNumber: true },
  })

  const ratings = await prisma.cbcCompetencyRating.findMany({
    where: {
      schoolId,
      academicYear,
      ...(term ? { term } : {}),
      ...(gradeLevel ? { gradeLevel } : {}),
    },
    include: {
      student: { select: { name: true, exam_number: true, grade: true } },
      competency: { select: { name: true, category: true } },
    },
    orderBy: [{ student: { name: 'asc' } }, { competency: { name: 'asc' } }],
  })

  const header = [
    'CentreNumber',
    'SchoolName',
    'AcademicYear',
    'Term',
    'StudentName',
    'ExamNumber',
    'GradeLevel',
    'Competency',
    'Category',
    'RatingLevel',
    'NumericScore',
    'EvidenceNote',
  ]

  const rows = ratings.map((r) =>
    [
      school?.eczCentreNumber || '',
      school?.name || '',
      academicYear,
      r.term,
      r.student?.name || '',
      r.student?.exam_number || '',
      r.gradeLevel,
      r.competency?.name || '',
      r.competency?.category || '',
      r.level,
      LEVEL_SCORE[r.level] || '',
      r.evidenceNote || '',
    ]
      .map(csvEscape)
      .join(',')
  )

  const csv = [header.join(','), ...rows].join('\n')

  return NextResponse.json({
    success: true,
    academicYear,
    recordCount: ratings.length,
    csvData: csv,
    deadline: `${academicYear + 1}-01-31`,
  })
})
