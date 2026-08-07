export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { assertPrimaryResultsAccess } from '@/lib/school/primaryResultsAccess'
import {
  buildPrimaryResultsAnalysis,
  currentTermLabel,
  parseTermParam,
  primaryResultTypeFilter,
} from '@/lib/results/primaryResultsAnalysis'
import { PRIMARY_RESULT_TYPES } from '@/lib/results/resultTypes'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Only headteachers can view school-wide primary results analysis', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertPrimaryResultsAccess(schoolId, { prismaClient: prisma })

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const term = parseTermParam(searchParams.get('term')) || currentTermLabel()
  const resultType = primaryResultTypeFilter(searchParams.get('resultType'))

  const rows = await prisma.result.findMany({
    where: {
      schoolId,
      year,
      term,
      resultType: resultType ? resultType : { in: PRIMARY_RESULT_TYPES },
    },
    select: {
      score: true,
      grade: true,
      subjectId: true,
      resultType: true,
      studentId: true,
      enteredByUserId: true,
    },
    take: 20000,
  })

  const subjectIds = [...new Set(rows.map((r) => r.subjectId).filter(Boolean))]
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { schoolId, id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : []
  const subjectNameById = new Map(subjects.map((s) => [String(s.id), s.name]))

  const analysis = buildPrimaryResultsAnalysis(rows, subjectNameById)

  return NextResponse.json({
    success: true,
    data: {
      filters: { year, term, resultType: resultType || 'ALL' },
      ...analysis,
    },
  })
})
