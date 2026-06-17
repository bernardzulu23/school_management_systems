import { parseAssessmentInteractive } from '@/lib/assessments/assessmentInteractive'

export function resolvePublishedAssignmentId(assessment) {
  if (assessment?.publishedAssignmentId) return assessment.publishedAssignmentId
  const interactive = parseAssessmentInteractive(assessment?.description)
  return interactive?.publishedAssignmentId || null
}

export function buildTeacherAssessmentOverview(assessments, submissions) {
  const subsByAssignment = new Map()
  for (const sub of submissions) {
    const id = String(sub.assignmentId)
    if (!subsByAssignment.has(id)) subsByAssignment.set(id, [])
    subsByAssignment.get(id).push(sub)
  }

  const byTeacher = new Map()
  let unassignedCount = 0
  const allScores = []

  for (const assessment of assessments) {
    const teacherId = assessment.createdByUserId
    if (!teacherId) {
      unassignedCount++
      continue
    }

    if (!byTeacher.has(teacherId)) {
      byTeacher.set(teacherId, {
        teacherId,
        teacherName: assessment.createdBy?.name || 'Unknown teacher',
        teacherEmail: assessment.createdBy?.email || '',
        totalAssessments: 0,
        publishedAssessments: 0,
        studentAttempts: 0,
        gradedAttempts: 0,
        scores: [],
        assessments: [],
      })
    }

    const row = byTeacher.get(teacherId)
    row.totalAssessments++

    const assignmentId = resolvePublishedAssignmentId(assessment)
    const subs = assignmentId ? subsByAssignment.get(String(assignmentId)) || [] : []
    const graded = subs.filter((s) => Number.isFinite(Number(s.grade)))
    const avgPct =
      graded.length > 0
        ? Math.round(graded.reduce((sum, s) => sum + Number(s.grade), 0) / graded.length)
        : null

    if (assignmentId) row.publishedAssessments++
    row.studentAttempts += subs.length
    row.gradedAttempts += graded.length
    for (const s of graded) {
      const score = Number(s.grade)
      row.scores.push(score)
      allScores.push(score)
    }

    row.assessments.push({
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      subject: assessment.subject,
      class: assessment.class,
      status: assessment.status,
      date: assessment.date,
      attempts: subs.length,
      gradedAttempts: graded.length,
      averagePercentage: avgPct,
    })
  }

  const teachers = [...byTeacher.values()]
    .map((t) => ({
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      teacherEmail: t.teacherEmail,
      totalAssessments: t.totalAssessments,
      publishedAssessments: t.publishedAssessments,
      studentAttempts: t.studentAttempts,
      gradedAttempts: t.gradedAttempts,
      averagePerformancePct:
        t.scores.length > 0
          ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
          : null,
      assessments: t.assessments.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => (b.averagePerformancePct ?? -1) - (a.averagePerformancePct ?? -1))

  const schoolAveragePct =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null

  return {
    teachers,
    unassignedCount,
    summary: {
      teacherCount: teachers.length,
      totalAssessments: assessments.length,
      publishedAssessments: teachers.reduce((sum, t) => sum + t.publishedAssessments, 0),
      studentAttempts: teachers.reduce((sum, t) => sum + t.studentAttempts, 0),
      gradedAttempts: teachers.reduce((sum, t) => sum + t.gradedAttempts, 0),
      schoolAveragePct,
    },
  }
}
