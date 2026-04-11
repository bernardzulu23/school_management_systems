import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

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

function avg(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function normalizeGender(value) {
  const g = String(value || '')
    .trim()
    .toLowerCase()
  if (!g) return 'unknown'
  if (g.startsWith('m')) return 'male'
  if (g.startsWith('f')) return 'female'
  return 'unknown'
}

function yearGroupFromClassName(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  const formMatch = lower.match(/\bform\s*([1-6])(?=\b|[a-z])/)
  if (formMatch?.[1]) return `Form ${Number(formMatch[1])}`
  const gradeMatch = lower.match(/\bgrade\s*(1[0-2]|[1-9])(?=\b|[a-z])/)
  if (gradeMatch?.[1]) return `Grade ${Number(gradeMatch[1])}`
  const leadingNumber = lower.match(/^\s*(\d{1,2})(?=\b|[a-z])/)
  if (leadingNumber?.[1]) {
    const n = Number(leadingNumber[1])
    if (n >= 1 && n <= 12) return `Grade ${n}`
  }
  return null
}

function buildGenderByGrade({ students, allowedYearGroups }) {
  const allowed = new Set(allowedYearGroups.map((x) => String(x)))
  const byGroup = new Map()

  for (const s of students) {
    const className = s?.class || ''
    const group = yearGroupFromClassName(className)
    if (!group || !allowed.has(group)) continue
    const gender = normalizeGender(s?.user?.gender)
    if (!byGroup.has(group)) byGroup.set(group, { grade: group, male: 0, female: 0, unknown: 0 })
    const entry = byGroup.get(group)
    entry[gender] += 1
  }

  return allowedYearGroups
    .filter((g) => byGroup.has(String(g)))
    .map((g) => {
      const row = byGroup.get(String(g))
      return { ...row, total: row.male + row.female + row.unknown }
    })
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const term = parseTermParam(searchParams.get('term')) || 'Term 2'

  const userId = auth.user.id
  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    select: { id: true, departmentId: true, department: true },
  })
  if (!hodProfile) throw new ApiError('HOD profile not found', 404)
  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.department,
  })
  const departmentIds = resolved.departmentIds
  const departmentNameAliases = resolved.departmentNameAliases
  if (departmentIds.length === 0) throw new ApiError('Department not assigned', 400)

  const teacherDepartments = await prisma.teacherDepartment.findMany({
    where: { departmentId: { in: departmentIds } },
    select: { teacherId: true },
  })

  const teachersByNameOrJoin =
    departmentNameAliases.length > 0 || departmentIds.length > 0
      ? await prisma.teacher.findMany({
          where: {
            schoolId,
            OR: [
              ...(departmentIds.length > 0
                ? [
                    {
                      departments: {
                        some: { departmentId: { in: departmentIds } },
                      },
                    },
                  ]
                : []),
              ...(departmentNameAliases.length > 0
                ? [
                    {
                      OR: departmentNameAliases.map((n) => ({
                        department: { equals: String(n), mode: 'insensitive' },
                      })),
                    },
                  ]
                : []),
            ],
          },
          select: { id: true },
          take: 20000,
        })
      : []

  const teacherIds = Array.from(
    new Set(
      [
        ...teacherDepartments.map((t) => String(t.teacherId || '')).filter(Boolean),
        ...teachersByNameOrJoin.map((t) => String(t.id || '')).filter(Boolean),
      ].filter(Boolean)
    )
  )

  if (teacherIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        departmentStats: { totalStudents: 0, averageScore: 0, passRate: 0, improvement: 0 },
        subjects: [],
        gradeDistribution: [],
        termComparison: [
          { term: 'Term 1', average: 0, passRate: 0 },
          { term: 'Term 2', average: 0, passRate: 0 },
          { term: 'Term 3', average: 0, passRate: 0 },
        ],
        recommendedActions: [],
        term,
        year,
      },
    })
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where: { schoolId, teacherId: { in: teacherIds } },
    select: { classId: true, subjectId: true },
  })

  const pairKeys = new Set()
  const pairs = []
  for (const a of assignments) {
    if (!a.classId || !a.subjectId) continue
    const key = `${a.classId}:${a.subjectId}`
    if (pairKeys.has(key)) continue
    pairKeys.add(key)
    pairs.push({ classId: a.classId, subjectId: a.subjectId })
  }

  if (pairs.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        departmentStats: { totalStudents: 0, averageScore: 0, passRate: 0, improvement: 0 },
        subjects: [],
        gradeDistribution: [],
        termComparison: [
          { term: 'Term 1', average: 0, passRate: 0 },
          { term: 'Term 2', average: 0, passRate: 0 },
          { term: 'Term 3', average: 0, passRate: 0 },
        ],
        recommendedActions: [],
        term,
        year,
      },
    })
  }

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: {
      schoolId,
      OR: pairs.slice(0, 2000),
    },
    select: { pupilId: true, subjectId: true },
    distinct: ['pupilId', 'subjectId'],
    take: 20000,
  })

  const pupilIds = Array.from(new Set(enrollments.map((e) => String(e.pupilId)).filter(Boolean)))
  const subjectIds = Array.from(
    new Set(enrollments.map((e) => String(e.subjectId)).filter(Boolean))
  )

  if (pupilIds.length === 0 || subjectIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        departmentStats: { totalStudents: 0, averageScore: 0, passRate: 0, improvement: 0 },
        subjects: [],
        gradeDistribution: [],
        termComparison: [
          { term: 'Term 1', average: 0, passRate: 0 },
          { term: 'Term 2', average: 0, passRate: 0 },
          { term: 'Term 3', average: 0, passRate: 0 },
        ],
        recommendedActions: [],
        term,
        year,
      },
    })
  }

  const subjects = await prisma.subject.findMany({
    where: { schoolId, id: { in: subjectIds } },
    select: { id: true, name: true },
  })
  const subjectNameById = new Map(subjects.map((s) => [String(s.id), s.name]))

  const resultsForTerm = await prisma.result.findMany({
    where: {
      schoolId,
      studentId: { in: pupilIds },
      subjectId: { in: subjectIds },
      term,
      year,
    },
    select: { studentId: true, subjectId: true, score: true, grade: true },
    take: 50000,
  })

  const termNumber = Number(String(term).replace(/[^0-9]/g, '') || '2')
  const prevTerm = termNumber > 1 ? `Term ${termNumber - 1}` : null

  const resultsPrevTerm = prevTerm
    ? await prisma.result.findMany({
        where: {
          schoolId,
          studentId: { in: pupilIds },
          subjectId: { in: subjectIds },
          term: prevTerm,
          year,
        },
        select: { subjectId: true, score: true },
        take: 50000,
      })
    : []

  const prevScoresBySubject = new Map()
  for (const r of resultsPrevTerm) {
    const sid = String(r.subjectId)
    if (!prevScoresBySubject.has(sid)) prevScoresBySubject.set(sid, [])
    prevScoresBySubject.get(sid).push(Number(r.score || 0))
  }

  const bySubject = new Map()
  const overallScores = []
  const overallStudents = new Set()
  let overallPassCount = 0

  for (const r of resultsForTerm) {
    const subjectId = String(r.subjectId)
    const score = Number(r.score || 0)
    const studentId = String(r.studentId)
    const pass = score >= 40

    overallScores.push(score)
    overallStudents.add(studentId)
    if (pass) overallPassCount += 1

    if (!bySubject.has(subjectId)) {
      bySubject.set(subjectId, {
        subjectId,
        students: new Set(),
        scores: [],
        passCount: 0,
      })
    }
    const entry = bySubject.get(subjectId)
    entry.students.add(studentId)
    entry.scores.push(score)
    if (pass) entry.passCount += 1
  }

  const subjectRows = Array.from(bySubject.values()).map((s) => {
    const currentAvg = avg(s.scores)
    const prevAvg = avg(prevScoresBySubject.get(String(s.subjectId)) || [])
    const improvement = prevTerm ? Math.round(currentAvg - prevAvg) : 0
    const studentCount = s.students.size
    const passRate = s.scores.length ? Math.round((s.passCount / s.scores.length) * 100) : 0
    return {
      subjectId: s.subjectId,
      subject: subjectNameById.get(String(s.subjectId)) || 'Unknown',
      students: studentCount,
      average: Math.round(currentAvg),
      passRate,
      improvement,
    }
  })

  subjectRows.sort((a, b) => a.subject.localeCompare(b.subject))

  const gradeCounts = new Map()
  for (const r of resultsForTerm) {
    const bucket = bucketGrade(r.grade)
    gradeCounts.set(bucket, (gradeCounts.get(bucket) || 0) + 1)
  }
  const gradeDistribution = Array.from(gradeCounts.entries()).map(([grade, count]) => ({
    grade,
    count,
    percentage: resultsForTerm.length ? Math.round((count / resultsForTerm.length) * 100) : 0,
  }))

  gradeDistribution.sort((a, b) => String(a.grade).localeCompare(String(b.grade)))

  const termComparison = []
  for (const t of ['Term 1', 'Term 2', 'Term 3']) {
    const termResults = await prisma.result.findMany({
      where: {
        schoolId,
        studentId: { in: pupilIds },
        subjectId: { in: subjectIds },
        term: t,
        year,
      },
      select: { score: true },
      take: 50000,
    })
    const scores = termResults.map((x) => Number(x.score || 0))
    const average = Math.round(avg(scores))
    const passRate = scores.length
      ? Math.round((scores.filter((s) => s >= 40).length / scores.length) * 100)
      : 0
    termComparison.push({ term: t, average, passRate })
  }

  const departmentAverage = Math.round(avg(overallScores))
  const departmentPassRate = resultsForTerm.length
    ? Math.round((overallPassCount / resultsForTerm.length) * 100)
    : 0

  const resultStudentIds = Array.from(
    new Set(resultsForTerm.map((r) => String(r.studentId || '')).filter(Boolean))
  )
  const studentsForGender = resultStudentIds.length
    ? await prisma.student.findMany({
        where: { schoolId, id: { in: resultStudentIds } },
        select: { id: true, class: true, user: { select: { gender: true } } },
        take: 20000,
      })
    : []

  const junior_gender_by_grade = buildGenderByGrade({
    students: studentsForGender,
    allowedYearGroups: ['Form 1', 'Form 2'],
  })
  const senior_gender_by_grade = buildGenderByGrade({
    students: studentsForGender,
    allowedYearGroups: ['Grade 10', 'Grade 11', 'Grade 12'],
  })

  const previousDepartmentAverage = prevTerm
    ? Math.round(avg(resultsPrevTerm.map((r) => Number(r.score || 0))))
    : 0

  const improvement = prevTerm ? departmentAverage - previousDepartmentAverage : 0

  const recommendedActions = []
  const worst = subjectRows.slice().sort((a, b) => a.passRate - b.passRate)[0]
  if (worst && worst.passRate < 70) {
    recommendedActions.push({
      level: 'danger',
      title: 'Immediate Attention Required',
      message: `${worst.subject} pass rate is ${worst.passRate}%. Consider remediation and extra support.`,
    })
  }

  const best = subjectRows.slice().sort((a, b) => b.improvement - a.improvement)[0]
  if (best && best.improvement > 0) {
    recommendedActions.push({
      level: 'success',
      title: 'Positive Improvement',
      message: `${best.subject} improved by +${best.improvement}%. Share best practices across the department.`,
    })
  }

  recommendedActions.push({
    level: 'info',
    title: 'Department Summary',
    message: `Department average is ${departmentAverage}% with pass rate ${departmentPassRate}%.`,
  })

  return NextResponse.json({
    success: true,
    data: {
      departmentStats: {
        totalStudents: overallStudents.size,
        averageScore: departmentAverage,
        passRate: departmentPassRate,
        improvement,
      },
      subjects: subjectRows,
      gradeDistribution,
      termComparison,
      recommendedActions,
      junior_gender_by_grade,
      senior_gender_by_grade,
      term,
      year,
    },
  })
})
