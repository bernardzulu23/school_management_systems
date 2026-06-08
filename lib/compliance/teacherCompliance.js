import prisma from '@/lib/prisma'
import { currentTermAndYear } from '@/lib/teachers/resolveTeacherLoad'
import { resolveTeachersAttendanceToday } from '@/lib/compliance/attendanceToday'

export function termDateRange(term, academicYear) {
  const year = Number(academicYear) || new Date().getFullYear()
  if (term === 'Term 1') {
    return { start: new Date(year, 0, 1), end: new Date(year, 3, 30, 23, 59, 59) }
  }
  if (term === 'Term 2') {
    return { start: new Date(year, 4, 1), end: new Date(year, 7, 31, 23, 59, 59) }
  }
  return { start: new Date(year, 8, 1), end: new Date(year, 11, 31, 23, 59, 59) }
}

/**
 * Pure domain flags for one teacher (unit-testable).
 */
export function classifyTeacherDomains({
  userId,
  hasAssessment,
  resultCount,
  resultsWithFeedback,
  hasEczActivity,
  hasAttendanceToday,
}) {
  return {
    assessments: hasAssessment ? 'ok' : 'missing',
    results: resultCount > 0 ? 'ok' : 'missing',
    results_feedback:
      resultCount === 0 ? 'missing' : resultsWithFeedback > 0 ? 'ok' : 'no_feedback',
    ecz_sba: hasEczActivity ? 'ok' : 'missing',
    attendance: hasAttendanceToday ? 'ok' : 'missing',
  }
}

/**
 * Evaluate compliance flags for teachers with a teaching load.
 * @param {string} schoolId
 */
export async function evaluateTeacherCompliance(schoolId) {
  const { term, academicYear } = currentTermAndYear()
  const year = Number(academicYear)
  const { start: termStart, end: termEnd } = termDateRange(term, academicYear)

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: {
      user: { select: { id: true, name: true } },
      teachingAssignments: { where: { schoolId }, select: { id: true } },
    },
  })

  const allocations = await prisma.teacherAllocation.findMany({
    where: {
      schoolId,
      status: { in: ['pushed', 'scheduled'] },
      term,
      academicYear,
    },
    select: { teacherId: true },
  })
  const allocatedUserIds = new Set(allocations.map((a) => a.teacherId))

  const activeTeachers = teachers.filter(
    (t) => (t.teachingAssignments?.length || 0) > 0 || allocatedUserIds.has(t.userId)
  )

  const userIds = activeTeachers.map((t) => t.userId)
  if (userIds.length === 0) {
    return {
      teachers: [],
      flagged: [],
      summary: {
        totalTeachers: 0,
        missingAssessments: 0,
        missingFeedback: 0,
        missingAttendance: 0,
        missingResults: 0,
        missingEczSba: 0,
      },
      term,
      academicYear,
    }
  }

  const [assessments, results, eczAssessments, eczScores, attendanceToday] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        schoolId,
        createdByUserId: { in: userIds },
        createdAt: { gte: termStart, lte: termEnd },
      },
      select: { createdByUserId: true },
    }),
    prisma.result.findMany({
      where: {
        schoolId,
        enteredByUserId: { in: userIds },
        term,
        year,
      },
      select: { enteredByUserId: true, comments: true },
    }),
    prisma.eczAssessment.findMany({
      where: {
        schoolId,
        createdBy: { in: userIds },
        OR: [{ academicYear }, { createdAt: { gte: termStart, lte: termEnd } }],
      },
      select: { id: true, createdBy: true },
    }),
    prisma.eczAssessmentScore.findMany({
      where: {
        schoolId,
        createdAt: { gte: termStart, lte: termEnd },
      },
      select: { assessmentId: true, submittedBy: true },
    }),
    resolveTeachersAttendanceToday(schoolId, activeTeachers),
  ])

  const assessmentByUser = new Set(assessments.map((a) => a.createdByUserId))
  const resultsByUser = new Map()
  for (const r of results) {
    const uid = r.enteredByUserId
    if (!uid) continue
    if (!resultsByUser.has(uid)) {
      resultsByUser.set(uid, { count: 0, withFeedback: 0 })
    }
    const row = resultsByUser.get(uid)
    row.count += 1
    if (String(r.comments || '').trim()) row.withFeedback += 1
  }

  const eczByUser = new Set(eczAssessments.map((e) => e.createdBy))
  for (const s of eczScores) {
    if (s.submittedBy) eczByUser.add(s.submittedBy)
  }
  const attendanceByUser = new Set(
    attendanceToday.completed.map((row) => row.userId).filter(Boolean)
  )

  const teachersOut = []
  const flagged = []
  let missingAssessments = 0
  let missingFeedback = 0
  let missingAttendance = 0
  let missingResults = 0
  let missingEczSba = 0

  for (const t of activeTeachers) {
    const uid = t.userId
    const name = t.user?.name || 'Unknown teacher'
    const resultStats = resultsByUser.get(uid) || { count: 0, withFeedback: 0 }

    const domains = classifyTeacherDomains({
      userId: uid,
      hasAssessment: assessmentByUser.has(uid),
      resultCount: resultStats.count,
      resultsWithFeedback: resultStats.withFeedback,
      hasEczActivity: eczByUser.has(uid),
      hasAttendanceToday: attendanceByUser.has(uid),
    })

    teachersOut.push({ id: t.id, userId: uid, name, domains })

    if (domains.assessments === 'missing') {
      missingAssessments += 1
      flagged.push({
        teacherId: t.id,
        teacherName: name,
        domain: 'assessments',
        reason: 'No assessment created this term',
      })
    }
    if (domains.results === 'missing') {
      missingResults += 1
      flagged.push({
        teacherId: t.id,
        teacherName: name,
        domain: 'results',
        reason: 'No results entered this term',
      })
    }
    if (domains.results_feedback === 'no_feedback') {
      missingFeedback += 1
      flagged.push({
        teacherId: t.id,
        teacherName: name,
        domain: 'results_feedback',
        reason: 'Results entered without feedback comments',
      })
    }
    if (domains.ecz_sba === 'missing') {
      missingEczSba += 1
      flagged.push({
        teacherId: t.id,
        teacherName: name,
        domain: 'ecz_sba',
        reason: 'No ECZ SBA activity this term',
      })
    }
    if (domains.attendance === 'missing') {
      missingAttendance += 1
      const missRow = attendanceToday.missing.find((row) => row.teacherId === t.id)
      flagged.push({
        teacherId: t.id,
        teacherName: name,
        domain: 'attendance',
        reason: missRow?.reason || 'No attendance recorded today',
      })
    }
  }

  return {
    teachers: teachersOut,
    flagged,
    attendanceToday: {
      date: attendanceToday.dateStr,
      completed: attendanceToday.completed,
      missing: attendanceToday.missing,
      useTimetableEngagement: attendanceToday.useTimetableEngagement,
    },
    summary: {
      totalTeachers: activeTeachers.length,
      missingAssessments,
      missingFeedback,
      missingAttendance,
      missingResults,
      missingEczSba,
      completedAttendance: attendanceToday.completed.length,
    },
    term,
    academicYear,
  }
}
