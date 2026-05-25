export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function avg(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

async function fallbackPairsForTeachers({ schoolId, teacherIds }) {
  const teachers = await prisma.teacher.findMany({
    where: { schoolId, id: { in: teacherIds } },
    select: {
      id: true,
      assignedSubjects: true,
      classes: { select: { id: true } },
      subjects: { select: { id: true, classId: true, name: true } },
    },
    take: 5000,
  })

  const tokenSet = new Set()
  for (const t of teachers) {
    const tokens = Array.isArray(t?.assignedSubjects) ? t.assignedSubjects : []
    for (const x of tokens) {
      const v = String(x || '').trim()
      if (v) tokenSet.add(v)
    }
  }
  const tokens = Array.from(tokenSet)

  const tokenSubjectCandidates =
    tokens.length > 0
      ? await prisma.subject.findMany({
          where: {
            schoolId,
            OR: [
              { id: { in: tokens } },
              ...tokens.map((t) => ({ name: { equals: t, mode: 'insensitive' } })),
            ],
          },
          select: { id: true, classId: true, name: true },
          take: 50000,
        })
      : []

  const tokenSubjectById = new Map(tokenSubjectCandidates.map((s) => [String(s.id), s]))
  const tokenSubjectByName = new Map(
    tokenSubjectCandidates.map((s) => [
      String(s.name || '')
        .trim()
        .toLowerCase(),
      s,
    ])
  )

  const pairKeys = new Set()
  const pairs = []

  for (const t of teachers) {
    const classIds = (t.classes || []).map((c) => String(c.id || '').trim()).filter(Boolean)

    const subjects = []
    for (const s of t.subjects || []) {
      if (s?.id) subjects.push(s)
    }

    const teacherTokens = Array.isArray(t?.assignedSubjects) ? t.assignedSubjects : []
    for (const tok of teacherTokens) {
      const token = String(tok || '').trim()
      if (!token) continue
      const byId = tokenSubjectById.get(token)
      const byName = tokenSubjectByName.get(token.toLowerCase())
      const resolved = byId || byName
      if (resolved?.id) subjects.push(resolved)
    }

    const subjectIdsSeen = new Set()
    const uniqueSubjects = subjects.filter((s) => {
      const id = String(s?.id || '').trim()
      if (!id || subjectIdsSeen.has(id)) return false
      subjectIdsSeen.add(id)
      return true
    })

    const subjectClassIds = uniqueSubjects
      .map((s) => String(s?.classId || '').trim())
      .filter(Boolean)
    const resolvedClassIds =
      classIds.length > 0 ? classIds : Array.from(new Set(subjectClassIds)).filter(Boolean)

    for (const s of uniqueSubjects) {
      const subjectId = String(s?.id || '').trim()
      if (!subjectId) continue

      const preferredClassId = String(s?.classId || '').trim()
      if (preferredClassId) {
        const key = `${preferredClassId}:${subjectId}`
        if (!pairKeys.has(key)) {
          pairKeys.add(key)
          pairs.push({ classId: preferredClassId, subjectId })
        }
        continue
      }

      for (const classId of resolvedClassIds) {
        const key = `${classId}:${subjectId}`
        if (pairKeys.has(key)) continue
        pairKeys.add(key)
        pairs.push({ classId, subjectId })
      }
    }
  }

  return pairs
}

async function computeForTeacherIds({ schoolId, teacherIds }) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: { schoolId, teacherId: { in: teacherIds } },
    select: { classId: true, subjectId: true },
    take: 5000,
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

  const effectivePairs =
    pairs.length > 0 ? pairs : await fallbackPairsForTeachers({ schoolId, teacherIds })
  if (effectivePairs.length === 0) {
    return { averageScore: 0, passRate: 0, resultsCount: 0, studentsCount: 0 }
  }

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, OR: effectivePairs.slice(0, 2000) },
    select: { pupilId: true, subjectId: true },
    distinct: ['pupilId', 'subjectId'],
    take: 50000,
  })

  const studentIds = Array.from(new Set(enrollments.map((e) => String(e.pupilId)).filter(Boolean)))
  const subjectIds = Array.from(
    new Set(enrollments.map((e) => String(e.subjectId)).filter(Boolean))
  )

  if (studentIds.length === 0 || subjectIds.length === 0) {
    return { averageScore: 0, passRate: 0, resultsCount: 0, studentsCount: 0 }
  }

  const results = await prisma.result.findMany({
    where: { schoolId, studentId: { in: studentIds }, subjectId: { in: subjectIds } },
    select: { studentId: true, score: true },
    take: 50000,
  })

  const scores = results.map((r) => Number(r.score || 0))
  const averageScore = Math.round(avg(scores))
  const passRate = scores.length
    ? Math.round((scores.filter((s) => s >= 40).length / scores.length) * 100)
    : 0
  const studentsCount = new Set(results.map((r) => String(r.studentId))).size

  return { averageScore, passRate, resultsCount: results.length, studentsCount }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true, department: true },
  })
  if (!teacher) throw new ApiError('Teacher profile not found', 404)

  const teacherDepartment = await prisma.teacherDepartment.findFirst({
    where: { teacherId: teacher.id },
    select: { departmentId: true },
  })

  if (!teacherDepartment?.departmentId) {
    return NextResponse.json({
      success: true,
      data: {
        department: teacher.department || null,
        teacher: await computeForTeacherIds({ schoolId, teacherIds: [teacher.id] }),
        departmentStats: { averageScore: 0, passRate: 0, resultsCount: 0, studentsCount: 0 },
      },
    })
  }

  const deptTeachers = await prisma.teacherDepartment.findMany({
    where: { departmentId: teacherDepartment.departmentId },
    select: { teacherId: true },
  })

  const deptTeacherIds = Array.from(
    new Set(deptTeachers.map((t) => String(t.teacherId || '')).filter(Boolean))
  )

  const [teacherStats, departmentStats] = await Promise.all([
    computeForTeacherIds({ schoolId, teacherIds: [teacher.id] }),
    computeForTeacherIds({ schoolId, teacherIds: deptTeacherIds }),
  ])

  const dept = await prisma.department.findFirst({
    where: { id: teacherDepartment.departmentId },
    select: { name: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      department: dept?.name || teacher.department || null,
      teacher: teacherStats,
      departmentStats,
    },
  })
})
