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

async function resolveTeacherScope({ schoolId, userId }) {
  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId },
    select: {
      id: true,
      userId: true,
      subjects: { select: { id: true, name: true } },
      teachingAssignments: {
        where: { schoolId },
        select: { subjectId: true, classId: true, subject: { select: { id: true, name: true } } },
      },
      classes: { select: { id: true } },
    },
  })
  if (!teacher) return null

  const subjectIdSet = new Set()
  const subjectNameById = new Map()
  const classIdSet = new Set()

  for (const a of teacher.teachingAssignments || []) {
    if (a.subjectId) subjectIdSet.add(String(a.subjectId))
    if (a.classId) classIdSet.add(String(a.classId))
    if (a.subject?.id) {
      subjectIdSet.add(String(a.subject.id))
      subjectNameById.set(String(a.subject.id), a.subject.name)
    }
  }
  for (const s of teacher.subjects || []) {
    if (s.id) {
      subjectIdSet.add(String(s.id))
      subjectNameById.set(String(s.id), s.name)
    }
  }
  for (const c of teacher.classes || []) {
    if (c.id) classIdSet.add(String(c.id))
  }

  return {
    teacherId: teacher.id,
    userId: teacher.userId,
    subjectIds: Array.from(subjectIdSet),
    classIds: Array.from(classIdSet),
    subjectNameById,
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('You are not authorized to view primary results analysis', 403)
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

  const scope = await resolveTeacherScope({ schoolId, userId: auth.user.id })
  if (!scope) throw new ApiError('Teacher profile not found', 404)

  const subjectIds = scope.subjectIds
  const where = {
    schoolId,
    year,
    term,
    resultType: resultType ? resultType : { in: PRIMARY_RESULT_TYPES },
    OR: [
      ...(subjectIds.length ? [{ subjectId: { in: subjectIds } }] : []),
      { enteredByUserId: auth.user.id },
    ],
  }

  const rows = await prisma.result.findMany({
    where,
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

  const analysis = buildPrimaryResultsAnalysis(rows, scope.subjectNameById)

  return NextResponse.json({
    success: true,
    data: {
      filters: { year, term, resultType: resultType || 'ALL' },
      scope: {
        subjectCount: scope.subjectIds.length,
        classCount: scope.classIds.length,
      },
      ...analysis,
    },
  })
})
