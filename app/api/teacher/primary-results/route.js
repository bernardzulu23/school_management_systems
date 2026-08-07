/**
 * Primary school numeric results entry (week 2 / week 7 / end of term).
 * Separate from secondary /api/teacher/results (which asserts secondary grading).
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { calculateGrade } from '@/lib/gradingSystem'
import { normalizeResultType, PRIMARY_RESULT_TYPES, RESULT_TYPES } from '@/lib/results/resultTypes'
import { assertPrimaryResultsAccess } from '@/lib/school/primaryResultsAccess'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { requireFeature } from '@/lib/middleware/planGate-zambia'

function parseTermYear(termRaw) {
  const term = String(termRaw || '').trim()
  const match = term.match(/(Term\s*\d+)\s*(\d{4})/i)
  if (match) return { term: match[1].trim(), year: Number(match[2]) }
  return { term: term || 'Term 1', year: new Date().getFullYear() }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('You are not authorized to view primary results', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertPrimaryResultsAccess(schoolId)
  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const classId = safeStringId(searchParams.get('classId'))
  const subjectId = safeStringId(searchParams.get('subjectId'))
  const termRaw = safeQueryString(searchParams.get('term'))
  const yearRaw = safeQueryString(searchParams.get('year'), { maxLength: 16 })
  const resultType = normalizeResultType(searchParams.get('resultType'), {
    defaultType: RESULT_TYPES.WEEK_2,
  })
  if (!PRIMARY_RESULT_TYPES.includes(resultType)) {
    throw new ApiError('Invalid primary result type', 400)
  }

  const { term, year: parsedYear } = parseTermYear(termRaw)
  const year = yearRaw ? Number(yearRaw) : parsedYear

  const students = classId
    ? await db.student.findMany({
        where: { schoolId, classId },
        select: { id: true, name: true, exam_number: true, class: true },
        orderBy: { name: 'asc' },
        take: 500,
      })
    : []

  const pupilIds = students.map((s) => s.id)
  const results =
    pupilIds.length && subjectId
      ? await db.result.findMany({
          where: {
            schoolId,
            subjectId,
            term,
            year,
            resultType,
            studentId: { in: pupilIds },
          },
          select: {
            id: true,
            studentId: true,
            score: true,
            grade: true,
            updatedAt: true,
            enteredByUserId: true,
          },
          take: 2000,
        })
      : []

  return NextResponse.json({
    success: true,
    data: {
      pupils: students,
      results,
      filters: { classId, subjectId, term, year, resultType },
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('You are not authorized to enter primary results', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertPrimaryResultsAccess(schoolId)
  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const db = getTenantClient(schoolId)
  const body = await request.json().catch(() => ({}))
  const results = Array.isArray(body?.results) ? body.results : []
  if (!results.length) throw new ApiError('No results provided', 400)

  const batchType = normalizeResultType(body?.resultType, { defaultType: RESULT_TYPES.WEEK_2 })
  if (!PRIMARY_RESULT_TYPES.includes(batchType)) {
    throw new ApiError('Invalid primary result type', 400)
  }

  let applied = 0
  await db.$transaction(async (tx) => {
    for (const r of results) {
      const studentId = safeStringId(r.studentId)
      const subjectId = safeStringId(r.subjectId)
      if (!studentId || !subjectId) continue
      const score =
        r.score === '' || r.score === null || r.score === undefined ? null : Number(r.score)
      if (score == null || Number.isNaN(score)) continue

      const term = String(r.term || 'Term 1').trim()
      const year = Number(r.year) || new Date().getFullYear()
      const resultType = normalizeResultType(r.resultType || batchType, {
        defaultType: batchType,
      })
      if (!PRIMARY_RESULT_TYPES.includes(resultType)) continue

      const gradeInfo = calculateGrade(score)
      const grade = gradeInfo?.grade || String(gradeInfo) || ''

      const existing = await tx.result.findFirst({
        where: { schoolId, studentId, subjectId, term, year, resultType },
        select: { id: true },
      })

      if (existing) {
        await tx.result.update({
          where: { id: existing.id },
          data: {
            score,
            grade,
            enteredByUserId: auth.user.id,
          },
        })
      } else {
        await tx.result.create({
          data: {
            schoolId,
            studentId,
            subjectId,
            term,
            year,
            resultType,
            score,
            grade,
            enteredByUserId: auth.user.id,
            workflowStatus: 'finalized',
          },
        })
      }
      applied += 1
    }
  })

  return NextResponse.json({ success: true, applied })
})

export const DELETE = withErrorHandler(async function DELETE(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('You are not authorized to delete primary results', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertPrimaryResultsAccess(schoolId)
  const db = getTenantClient(schoolId)

  const id = safeStringId(new URL(request.url).searchParams.get('id'))
  if (!id) throw new ApiError('Result id is required', 400)

  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const result = await db.result.findFirst({
    where: { id, schoolId },
    select: { id: true, enteredByUserId: true, resultType: true },
  })
  if (!result) throw new ApiError('Result not found', 404)
  if (!PRIMARY_RESULT_TYPES.includes(String(result.resultType || ''))) {
    throw new ApiError('Not a primary assessment result', 400)
  }

  if (!isAdmin && String(result.enteredByUserId || '') !== String(auth.user.id)) {
    throw new ApiError('You can only delete primary results you entered', 403)
  }

  await db.result.deleteMany({ where: { id: result.id, schoolId } })
  return NextResponse.json({ success: true })
})
