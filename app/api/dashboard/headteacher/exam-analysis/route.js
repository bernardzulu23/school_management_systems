/**
 * Headteacher school-wide exam / results analysis (secondary grading).
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { assertSecondaryGradingForContext } from '@/lib/school/gradingAccess'
import {
  getResultTypeLabel,
  listTrackedResultTypes,
  normalizeResultType,
} from '@/lib/results/resultTypes'
import { requireFeature } from '@/lib/middleware/planGate-zambia'

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

const PASS = 40

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Only headteachers can view school-wide exam analysis', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertSecondaryGradingForContext(schoolId, { prismaClient: prisma })
  const featureBlock = await requireFeature(schoolId, 'basic-results')
  if (featureBlock) return featureBlock

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const term = parseTermParam(searchParams.get('term')) || currentTermLabel()
  const resultTypeRaw = String(searchParams.get('resultType') || '').trim()
  const resultTypeFilter =
    resultTypeRaw && resultTypeRaw.toLowerCase() !== 'all'
      ? normalizeResultType(resultTypeRaw, { defaultType: null }) || resultTypeRaw.toUpperCase()
      : null

  const distinctTypes = await prisma.result.findMany({
    where: { schoolId, year, term },
    select: { resultType: true },
    distinct: ['resultType'],
    take: 50,
  })
  const availableResultTypes = listTrackedResultTypes(
    distinctTypes.map((r) => r.resultType).filter(Boolean)
  )

  const results = await prisma.result.findMany({
    where: {
      schoolId,
      year,
      term,
      ...(resultTypeFilter ? { resultType: resultTypeFilter } : {}),
    },
    select: {
      score: true,
      grade: true,
      subjectId: true,
      resultType: true,
      studentId: true,
      enteredByUserId: true,
      student: { select: { id: true, class: true, classId: true } },
    },
    take: 50000,
  })

  const subjectIds = [...new Set(results.map((r) => String(r.subjectId)).filter(Boolean))]
  const subjects =
    subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { schoolId, id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : []
  const subjectNameById = new Map(subjects.map((s) => [String(s.id), s.name]))

  const departments = await prisma.department.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      teachers: { select: { teacherId: true, teacher: { select: { userId: true } } } },
    },
    take: 200,
  })

  const teacherUserToDepts = new Map()
  for (const d of departments) {
    for (const td of d.teachers || []) {
      const uid = String(td.teacher?.userId || '')
      if (!uid) continue
      if (!teacherUserToDepts.has(uid)) teacherUserToDepts.set(uid, [])
      teacherUserToDepts.get(uid).push({ id: d.id, name: d.name })
    }
  }

  const overallScores = []
  const overallStudents = new Set()
  let passCount = 0
  const bySubject = new Map()
  const byClass = new Map()
  const byDepartment = new Map()
  const byType = new Map()
  const gradeCounts = new Map()

  for (const r of results) {
    const score = Number(r.score || 0)
    const sid = String(r.subjectId)
    const studentId = String(r.studentId)
    const classKey = String(r.student?.class || r.student?.classId || 'Unknown')
    const typeKey = String(r.resultType || 'END_OF_TERM')
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

    if (!byType.has(typeKey)) {
      byType.set(typeKey, { resultType: typeKey, scores: [], students: new Set(), passCount: 0 })
    }
    const typ = byType.get(typeKey)
    typ.scores.push(score)
    typ.students.add(studentId)
    if (score >= PASS) typ.passCount += 1

    const depts = teacherUserToDepts.get(String(r.enteredByUserId || '')) || [
      { id: 'unassigned', name: 'Unassigned / other' },
    ]
    for (const d of depts) {
      const key = d.id
      if (!byDepartment.has(key)) {
        byDepartment.set(key, {
          departmentId: d.id,
          departmentName: d.name,
          scores: [],
          students: new Set(),
          passCount: 0,
        })
      }
      const dep = byDepartment.get(key)
      dep.scores.push(score)
      dep.students.add(studentId)
      if (score >= PASS) dep.passCount += 1
    }

    const bucket = bucketGrade(r.grade)
    gradeCounts.set(bucket, (gradeCounts.get(bucket) || 0) + 1)
  }

  const subjectRows = Array.from(bySubject.values())
    .map((s) => ({
      subjectId: s.subjectId,
      subject: subjectNameById.get(s.subjectId) || 'Unknown',
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

  const departmentRows = Array.from(byDepartment.values())
    .map((d) => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      students: d.students.size,
      average: Math.round(avg(d.scores)),
      passRate: d.scores.length ? Math.round((d.passCount / d.scores.length) * 100) : 0,
      resultCount: d.scores.length,
    }))
    .sort((a, b) => a.departmentName.localeCompare(b.departmentName))

  const typeRows = Array.from(byType.values())
    .map((t) => ({
      resultType: t.resultType,
      label: getResultTypeLabel(t.resultType),
      students: t.students.size,
      average: Math.round(avg(t.scores)),
      passRate: t.scores.length ? Math.round((t.passCount / t.scores.length) * 100) : 0,
      resultCount: t.scores.length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const gradeDistribution = Array.from(gradeCounts.entries())
    .map(([grade, count]) => ({
      grade,
      count,
      percentage: results.length ? Math.round((count / results.length) * 100) : 0,
    }))
    .sort((a, b) => String(a.grade).localeCompare(String(b.grade)))

  return NextResponse.json({
    success: true,
    data: {
      filters: { year, term, resultType: resultTypeFilter || 'ALL' },
      availableResultTypes,
      stats: {
        totalStudents: overallStudents.size,
        averageScore: Math.round(avg(overallScores)),
        passRate: overallScores.length ? Math.round((passCount / overallScores.length) * 100) : 0,
        resultCount: results.length,
      },
      subjects: subjectRows,
      byClass: byClassRows,
      byDepartment: departmentRows,
      byResultType: typeRows,
      gradeDistribution,
    },
  })
})
