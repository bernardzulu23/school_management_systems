export const dynamic = 'force-dynamic'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import { safeQueryString } from '@/lib/security/safeQueryValue'

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

function formatCsvRow(r, school, academicYear) {
  return [
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

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'continuous-assessment-tool')
  if (typeBlock) return typeBlock

  const { searchParams } = new URL(request.url)
  const yearRaw = safeQueryString(searchParams.get('academicYear'))
  const academicYear = yearRaw ? Number(yearRaw) : new Date().getFullYear()
  const termRaw = safeQueryString(searchParams.get('term'))
  const term = termRaw ? Number(termRaw) : undefined
  const gradeLevel = safeQueryString(searchParams.get('gradeLevel'))

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, eczCentreNumber: true },
  })

  const where = {
    schoolId,
    academicYear,
    ...(term != null && Number.isFinite(term) ? { term } : {}),
    ...(gradeLevel ? { gradeLevel } : {}),
  }

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
  ].join(',')

  const encoder = new TextEncoder()
  const batchSize = 500
  let recordCount = 0

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${header}\n`))
      let skip = 0
      for (;;) {
        const batch = await prisma.cbcCompetencyRating.findMany({
          where,
          include: {
            student: { select: { name: true, exam_number: true } },
            competency: { select: { name: true, category: true } },
          },
          orderBy: [{ student: { name: 'asc' } }, { competency: { name: 'asc' } }],
          skip,
          take: batchSize,
        })
        if (!batch.length) break
        for (const row of batch) {
          controller.enqueue(encoder.encode(`${formatCsvRow(row, school, academicYear)}\n`))
        }
        recordCount += batch.length
        skip += batch.length
        if (batch.length < batchSize) break
      }
      controller.close()
    },
  })

  const filename = `cbc-continuous-assessment-${academicYear}${term ? `-term${term}` : ''}.csv`

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Record-Count': String(recordCount),
    },
  })
})
