export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'
import { getHodProfile } from '@/lib/utils/hodDepartmentScope'
import { normalizeResultType } from '@/lib/results/resultTypes'

function emptyExamAnalysis(term, year, resultType = null) {
  return {
    departmentStats: { totalStudents: 0, averageScore: 0, passRate: 0, improvement: 0 },
    subjects: [],
    gradeDistribution: [],
    termComparison: [
      { term: 'Term 1', average: 0, passRate: 0 },
      { term: 'Term 2', average: 0, passRate: 0 },
      { term: 'Term 3', average: 0, passRate: 0 },
    ],
    recommendedActions: [],
    junior_gender_by_grade: [],
    senior_gender_by_grade: [],
    term,
    year,
    resultType,
  }
}

function canAccessHodExamAnalysis(user) {
  const role = String(user?.role || '').toLowerCase()
  if (roleCheck(user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) return true
  return Boolean(user?.hodProfile)
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
  const month = date.getUTCMonth() // 0-11
  if (month < 4) return 'Term 1'
  if (month < 8) return 'Term 2'
  return 'Term 3'
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

/**
 * Resolve department subject + teacher-user scope without requiring pupil enrollments.
 * Schools often have Result rows before PupilSubjectEnrollment is populated.
 */
async function resolveDepartmentResultScope({
  prismaClient,
  schoolId,
  departmentIds,
  departmentNameAliases,
}) {
  const teacherDepartments = await prismaClient.teacherDepartment.findMany({
    where: { departmentId: { in: departmentIds }, department: { schoolId } },
    select: { teacherId: true },
  })

  const teachersByNameOrJoin =
    departmentNameAliases.length > 0 || departmentIds.length > 0
      ? await prismaClient.teacher.findMany({
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
          select: {
            id: true,
            userId: true,
            assignedSubjects: true,
            subjects: { select: { id: true } },
            teachingAssignments: {
              where: { schoolId },
              select: { subjectId: true },
            },
          },
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
    return { subjectIds: [], teacherUserIds: [], teacherIds: [], pupilIds: null }
  }

  const teachers =
    teachersByNameOrJoin.length > 0
      ? teachersByNameOrJoin.filter((t) => teacherIds.includes(String(t.id)))
      : await prismaClient.teacher.findMany({
          where: { schoolId, id: { in: teacherIds } },
          select: {
            id: true,
            userId: true,
            assignedSubjects: true,
            subjects: { select: { id: true } },
            teachingAssignments: {
              where: { schoolId },
              select: { subjectId: true },
            },
          },
          take: 20000,
        })

  const subjectIdSet = new Set()
  const teacherUserIds = []

  for (const t of teachers) {
    if (t.userId) teacherUserIds.push(String(t.userId))
    for (const a of t.teachingAssignments || []) {
      if (a?.subjectId) subjectIdSet.add(String(a.subjectId))
    }
    for (const s of t.subjects || []) {
      if (s?.id) subjectIdSet.add(String(s.id))
    }
  }

  const tokens = []
  for (const t of teachers) {
    for (const x of Array.isArray(t.assignedSubjects) ? t.assignedSubjects : []) {
      const v = String(x || '').trim()
      if (v) tokens.push(v)
    }
  }

  if (tokens.length > 0) {
    const tokenSubjects = await prismaClient.subject.findMany({
      where: {
        schoolId,
        OR: [
          { id: { in: tokens } },
          ...tokens.slice(0, 200).map((tok) => ({ name: { equals: tok, mode: 'insensitive' } })),
        ],
      },
      select: { id: true },
      take: 5000,
    })
    for (const s of tokenSubjects) subjectIdSet.add(String(s.id))
  }

  // Prefer enrollments when present (tighter pupil scope), but never require them.
  let pupilIds = null
  const subjectIds = Array.from(subjectIdSet)
  if (subjectIds.length > 0) {
    const enrollments = await prismaClient.pupilSubjectEnrollment.findMany({
      where: { schoolId, subjectId: { in: subjectIds } },
      select: { pupilId: true },
      distinct: ['pupilId'],
      take: 20000,
    })
    const ids = Array.from(new Set(enrollments.map((e) => String(e.pupilId)).filter(Boolean)))
    if (ids.length > 0) pupilIds = ids
  }

  return {
    subjectIds,
    teacherUserIds: Array.from(new Set(teacherUserIds.filter(Boolean))),
    teacherIds,
    pupilIds,
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!canAccessHodExamAnalysis(auth.user)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const term = parseTermParam(searchParams.get('term')) || currentTermLabel()
  const resultTypeRaw = String(searchParams.get('resultType') || '').trim()
  const resultType = resultTypeRaw ? normalizeResultType(resultTypeRaw) : null

  const userId = auth.user.id
  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const hodProfile = await getHodProfile(prisma, userId, schoolId)

  if (!hodProfile && !isAdminOrHead) {
    throw new ApiError('HOD profile not found', 404)
  }

  let schoolWide = isAdminOrHead && !hodProfile
  let pupilIds = null
  let subjectIds = null
  let teacherUserIds = null

  if (!schoolWide && hodProfile) {
    const resolved = await resolveDepartmentScope({
      prisma,
      schoolId,
      departmentId: hodProfile.departmentId,
      departmentName: hodProfile.department,
    })
    const departmentIds = resolved.departmentIds
    const departmentNameAliases = resolved.departmentNameAliases

    if (departmentIds.length === 0) {
      if (isAdminOrHead) schoolWide = true
      else {
        return NextResponse.json({
          success: true,
          data: emptyExamAnalysis(term, year, resultType),
        })
      }
    }

    if (!schoolWide) {
      const scope = await resolveDepartmentResultScope({
        prismaClient: prisma,
        schoolId,
        departmentIds,
        departmentNameAliases,
      })

      if (scope.subjectIds.length === 0 && scope.teacherUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: emptyExamAnalysis(term, year, resultType),
        })
      }

      subjectIds = scope.subjectIds.length ? scope.subjectIds : null
      teacherUserIds = scope.teacherUserIds.length ? scope.teacherUserIds : null
      pupilIds = scope.pupilIds
    }
  }

  const deptOrClauses = []
  if (subjectIds?.length) deptOrClauses.push({ subjectId: { in: subjectIds } })
  if (teacherUserIds?.length) deptOrClauses.push({ enteredByUserId: { in: teacherUserIds } })

  const resultScope = {
    schoolId,
    term,
    year,
    ...(resultType ? { resultType } : {}),
    ...(pupilIds?.length ? { studentId: { in: pupilIds } } : {}),
    ...(deptOrClauses.length > 0 ? { OR: deptOrClauses } : {}),
  }

  let subjectNameById = new Map()
  if (subjectIds?.length) {
    const subjects = await prisma.subject.findMany({
      where: { schoolId, id: { in: subjectIds } },
      select: { id: true, name: true },
    })
    subjectNameById = new Map(subjects.map((s) => [String(s.id), s.name]))
  } else {
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      take: 5000,
    })
    subjectNameById = new Map(subjects.map((s) => [String(s.id), s.name]))
  }

  const resultsForTerm = await prisma.result.findMany({
    where: { schoolId, ...resultScope },
    select: { studentId: true, subjectId: true, score: true, grade: true, resultType: true },
    take: 50000,
  })

  if (!subjectIds?.length && resultsForTerm.length) {
    subjectIds = Array.from(new Set(resultsForTerm.map((r) => String(r.subjectId)).filter(Boolean)))
    const missingSubjectIds = subjectIds.filter((id) => !subjectNameById.has(id))
    if (missingSubjectIds.length) {
      const extraSubjects = await prisma.subject.findMany({
        where: { schoolId, id: { in: missingSubjectIds } },
        select: { id: true, name: true },
      })
      for (const s of extraSubjects) subjectNameById.set(String(s.id), s.name)
    }
  }

  const termNumber = Number(String(term).replace(/[^0-9]/g, '') || '2')
  const prevTerm = termNumber > 1 ? `Term ${termNumber - 1}` : null

  const resultsPrevTerm = prevTerm
    ? await prisma.result.findMany({
        where: {
          schoolId,
          ...resultScope,
          term: prevTerm,
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
        ...resultScope,
        term: t,
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
    message: `Department average is ${departmentAverage}% with pass rate ${departmentPassRate}%${
      resultType ? ` (${resultType.replace(/_/g, ' ').toLowerCase()})` : ' (all result types)'
    }.`,
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
      resultType,
    },
  })
})
