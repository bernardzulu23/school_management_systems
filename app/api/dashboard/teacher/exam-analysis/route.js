export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  listTrackedResultTypes,
  normalizeResultType,
  getResultTypeLabel,
} from '@/lib/results/resultTypes'

function avg(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function bucketGrade(gradeRaw) {
  const g = String(gradeRaw || '')
    .trim()
    .toUpperCase()
  if (!g) return 'Unknown'
  if (g.startsWith('A')) return 'A'
  if (g.startsWith('B')) return 'B'
  if (g.startsWith('C')) return 'C'
  if (g.startsWith('D')) return 'D'
  if (g.startsWith('E')) return 'E'
  if (g.startsWith('F')) return 'F'
  return g
}

function parseTermParam(termRaw) {
  const raw = String(termRaw || '').trim()
  if (!raw) return null
  const normalized = raw.toLowerCase()
  if (normalized.startsWith('term')) {
    const digits = normalized.replace(/[^0-9]/g, '')
    if (digits) return `Term ${Number(digits)}`
  }
  return raw
}

function currentTermLabel(date = new Date()) {
  const month = date.getUTCMonth()
  if (month < 4) return 'Term 1'
  if (month < 8) return 'Term 2'
  return 'Term 3'
}

async function resolveTeacherScope({ schoolId, userId }) {
  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId },
    select: {
      id: true,
      userId: true,
      assignedSubjects: true,
      subjects: { select: { id: true, name: true } },
      teachingAssignments: {
        where: { schoolId },
        select: { subjectId: true, classId: true, subject: { select: { id: true, name: true } } },
      },
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
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { assertSecondaryGradingForContext } = await import('@/lib/school/gradingAccess')
  await assertSecondaryGradingForContext(schoolId, { prismaClient: prisma })

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const term = parseTermParam(searchParams.get('term')) || currentTermLabel()
  const resultTypeRaw = String(searchParams.get('resultType') || '').trim()
  const assessmentTypeRaw = String(searchParams.get('assessmentType') || '').trim()

  const scope = await resolveTeacherScope({ schoolId, userId: auth.user.id })
  if (!scope) {
    throw new ApiError('Teacher profile not found', 404)
  }

  const subjectIds = scope.subjectIds
  if (!subjectIds.length) {
    return NextResponse.json({
      success: true,
      data: {
        term,
        year,
        resultType: resultTypeRaw || null,
        stats: { totalStudents: 0, averageScore: 0, passRate: 0, resultCount: 0 },
        subjects: [],
        gradeDistribution: [],
        byClass: [],
        availableResultTypes: listTrackedResultTypes([]),
        availableAssessmentTypes: [],
        assessmentBreakdown: [],
      },
    })
  }

  // Discover every resultType this teacher has recorded (plus configured types).
  const distinctResultTypes = await prisma.result.findMany({
    where: {
      schoolId,
      OR: [{ subjectId: { in: subjectIds } }, { enteredByUserId: scope.userId }],
    },
    select: { resultType: true },
    distinct: ['resultType'],
    take: 50,
  })
  const availableResultTypes = listTrackedResultTypes(
    distinctResultTypes.map((r) => r.resultType).filter(Boolean)
  )

  const resultTypeFilter = resultTypeRaw
    ? Object.values(
        Object.fromEntries(availableResultTypes.map((t) => [t.value, t.value]))
      ).includes(
        String(resultTypeRaw)
          .toUpperCase()
          .replace(/[\s-]+/g, '_')
      )
      ? String(resultTypeRaw)
          .toUpperCase()
          .replace(/[\s-]+/g, '_')
      : normalizeResultType(resultTypeRaw)
    : null

  const results = await prisma.result.findMany({
    where: {
      schoolId,
      term,
      year,
      ...(resultTypeFilter ? { resultType: resultTypeFilter } : {}),
      OR: [{ subjectId: { in: subjectIds } }, { enteredByUserId: scope.userId }],
    },
    select: {
      studentId: true,
      subjectId: true,
      score: true,
      grade: true,
      resultType: true,
      student: { select: { class: true, classId: true } },
    },
    take: 50000,
  })

  // Fill subject names for any missing ids
  const missingSubjectIds = Array.from(
    new Set(
      results.map((r) => String(r.subjectId)).filter((id) => id && !scope.subjectNameById.has(id))
    )
  )
  if (missingSubjectIds.length) {
    const extras = await prisma.subject.findMany({
      where: { schoolId, id: { in: missingSubjectIds } },
      select: { id: true, name: true },
    })
    for (const s of extras) scope.subjectNameById.set(String(s.id), s.name)
  }

  const bySubject = new Map()
  const byClass = new Map()
  const overallScores = []
  const overallStudents = new Set()
  let passCount = 0
  const PASS = 40

  for (const r of results) {
    const score = Number(r.score || 0)
    const sid = String(r.subjectId)
    const studentId = String(r.studentId)
    const classKey = String(r.student?.class || r.student?.classId || 'Unknown')
    overallScores.push(score)
    overallStudents.add(studentId)
    if (score >= PASS) passCount += 1

    if (!bySubject.has(sid)) {
      bySubject.set(sid, { subjectId: sid, scores: [], students: new Set(), passCount: 0 })
    }
    const sub = bySubject.get(sid)
    sub.scores.push(score)
    sub.students.add(studentId)
    if (score >= PASS) sub.passCount += 1

    if (!byClass.has(classKey)) {
      byClass.set(classKey, { className: classKey, scores: [], students: new Set(), passCount: 0 })
    }
    const cls = byClass.get(classKey)
    cls.scores.push(score)
    cls.students.add(studentId)
    if (score >= PASS) cls.passCount += 1
  }

  const subjects = Array.from(bySubject.values())
    .map((s) => ({
      subjectId: s.subjectId,
      subject: scope.subjectNameById.get(s.subjectId) || 'Unknown',
      students: s.students.size,
      average: Math.round(avg(s.scores)),
      passRate: s.scores.length ? Math.round((s.passCount / s.scores.length) * 100) : 0,
      resultCount: s.scores.length,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject))

  const byClassRows = Array.from(byClass.values())
    .map((c) => ({
      className: c.className,
      students: c.students.size,
      average: Math.round(avg(c.scores)),
      passRate: c.scores.length ? Math.round((c.passCount / c.scores.length) * 100) : 0,
      resultCount: c.scores.length,
    }))
    .sort((a, b) => a.className.localeCompare(b.className))

  const gradeCounts = new Map()
  for (const r of results) {
    const bucket = bucketGrade(r.grade)
    gradeCounts.set(bucket, (gradeCounts.get(bucket) || 0) + 1)
  }
  const gradeDistribution = Array.from(gradeCounts.entries())
    .map(([grade, count]) => ({
      grade,
      count,
      percentage: results.length ? Math.round((count / results.length) * 100) : 0,
    }))
    .sort((a, b) => String(a.grade).localeCompare(String(b.grade)))

  // Assessment papers the teacher owns — types discovered from DB (quiz/exam/assignment/…).
  const assessments = await prisma.assessment.findMany({
    where: {
      schoolId,
      createdByUserId: scope.userId,
    },
    select: {
      id: true,
      title: true,
      type: true,
      subject: true,
      classId: true,
      _count: { select: { assignments: true } },
    },
    take: 2000,
  })

  const assessmentTypeMap = new Map()
  for (const a of assessments) {
    const t =
      String(a.type || 'unknown')
        .trim()
        .toLowerCase() || 'unknown'
    if (!assessmentTypeMap.has(t)) {
      assessmentTypeMap.set(t, {
        type: t,
        label: t
          .split(/[_\s-]+/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        count: 0,
        assignments: 0,
      })
    }
    const row = assessmentTypeMap.get(t)
    row.count += 1
    row.assignments += Number(a._count?.assignments || 0)
  }

  let assessmentBreakdown = Array.from(assessmentTypeMap.values()).sort((a, b) =>
    a.type.localeCompare(b.type)
  )
  if (assessmentTypeRaw) {
    const want = assessmentTypeRaw.toLowerCase()
    assessmentBreakdown = assessmentBreakdown.filter((r) => r.type === want)
  }

  return NextResponse.json({
    success: true,
    data: {
      term,
      year,
      resultType: resultTypeFilter,
      resultTypeLabel: resultTypeFilter ? getResultTypeLabel(resultTypeFilter) : 'All types',
      stats: {
        totalStudents: overallStudents.size,
        averageScore: Math.round(avg(overallScores)),
        passRate: results.length ? Math.round((passCount / results.length) * 100) : 0,
        resultCount: results.length,
      },
      subjects,
      byClass: byClassRows,
      gradeDistribution,
      availableResultTypes,
      availableAssessmentTypes: Array.from(assessmentTypeMap.values()).map((r) => ({
        value: r.type,
        label: r.label,
      })),
      assessmentBreakdown,
    },
  })
})
