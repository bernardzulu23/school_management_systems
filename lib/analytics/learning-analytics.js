/**
 * Phase 3 P3.2 — Learning analytics aggregates per role.
 */
import prisma from '@/lib/prisma'

/**
 * @param {string} schoolId
 * @param {{ term?: number, academicYear?: number }} opts
 */
export async function getHeadteacherLearningAnalytics(schoolId, opts = {}) {
  const year = Number(opts.academicYear) || new Date().getFullYear()
  const term = opts.term != null ? Number(opts.term) : null

  const scoreWhere = {
    schoolId,
    academicYear: year,
    ...(term != null ? { assessment: { term } } : {}),
  }

  const scores = await prisma.eczAssessmentScore.findMany({
    where: scoreWhere,
    select: {
      totalSBAScore: true,
      studentId: true,
      assessment: { select: { subject: { select: { id: true, name: true } } } },
    },
  })

  const bySubject = new Map()
  for (const s of scores) {
    const sub = s.assessment?.subject
    if (!sub) continue
    const key = sub.id
    const row = bySubject.get(key) || {
      subjectId: sub.id,
      subjectName: sub.name,
      count: 0,
      sum: 0,
      buckets: { excellent: 0, good: 0, fair: 0, weak: 0 },
    }
    const v = Number(s.totalSBAScore) || 0
    row.count += 1
    row.sum += v
    if (v >= 80) row.buckets.excellent += 1
    else if (v >= 60) row.buckets.good += 1
    else if (v >= 40) row.buckets.fair += 1
    else row.buckets.weak += 1
    bySubject.set(key, row)
  }

  const subjectDistributions = [...bySubject.values()].map((r) => ({
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    average: r.count ? Math.round((r.sum / r.count) * 10) / 10 : 0,
    count: r.count,
    distribution: r.buckets,
  }))

  const lessonPlanWhere = { schoolId, ...(term != null ? { term: String(term) } : {}) }
  const [totalPlans, approvedPlans, pendingPlans] = await Promise.all([
    prisma.lessonPlan.count({ where: lessonPlanWhere }),
    prisma.lessonPlan.count({ where: { ...lessonPlanWhere, status: 'APPROVED' } }),
    prisma.lessonPlan.count({
      where: { ...lessonPlanWhere, status: { in: ['SUBMITTED', 'DRAFT'] } },
    }),
  ])

  return {
    role: 'headteacher',
    academicYear: year,
    term,
    sba: {
      subjectDistributions,
      totalScores: scores.length,
    },
    lessonPlans: {
      total: totalPlans,
      approved: approvedPlans,
      pending: pendingPlans,
      approvalRate: totalPlans ? Math.round((approvedPlans / totalPlans) * 100) : 0,
    },
  }
}

/**
 * @param {string} schoolId
 * @param {string} departmentName
 */
export async function getHodLearningAnalytics(schoolId, departmentName, opts = {}) {
  const year = Number(opts.academicYear) || new Date().getFullYear()
  const dept = String(departmentName || '').trim()

  const teachers = await prisma.teacher.findMany({
    where: { schoolId, ...(dept ? { department: dept } : {}) },
    select: { userId: true, user: { select: { name: true } } },
  })
  const userIds = teachers.map((t) => t.userId)

  const plans = await prisma.lessonPlan.findMany({
    where: {
      schoolId,
      createdByUserId: { in: userIds },
    },
    select: { status: true, subject: true, createdBy: { select: { name: true } } },
  })

  const byTeacher = new Map()
  for (const p of plans) {
    const name = p.createdBy?.name || 'Teacher'
    const row = byTeacher.get(name) || { teacherName: name, total: 0, approved: 0, submitted: 0 }
    row.total += 1
    if (p.status === 'APPROVED') row.approved += 1
    if (p.status === 'SUBMITTED') row.submitted += 1
    byTeacher.set(name, row)
  }

  const eczTasks = await prisma.eczAssessment.count({
    where: {
      schoolId,
      component: 'SBA_TASK',
      ...(dept
        ? {
            subject: { name: { contains: dept, mode: 'insensitive' } },
          }
        : {}),
    },
  })

  return {
    role: 'hod',
    department: dept || 'All',
    academicYear: year,
    lessonPlanSubmission: [...byTeacher.values()],
    eczSbaTasks: eczTasks,
    eczAlignmentNote:
      'Ensure SBA tasks include Zambian context and map to subject construct elements.',
  }
}

/**
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function getStudentLearningAnalytics(schoolId, studentId, opts = {}) {
  const year = Number(opts.academicYear) || new Date().getFullYear()

  const [scores, competencies, attendance] = await Promise.all([
    prisma.eczAssessmentScore.findMany({
      where: { schoolId, studentId, academicYear: year },
      select: {
        totalSBAScore: true,
        assessment: {
          select: {
            subject: { select: { name: true } },
          },
        },
      },
    }),
    prisma.eczCompetency.findMany({
      select: { id: true, name: true, category: true },
      take: 12,
    }),
    prisma.attendance.findMany({
      where: {
        schoolId,
        studentId,
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { status: true },
    }),
  ])

  const subjectProgress = scores.map((s) => ({
    subject: s.assessment?.subject?.name || 'Subject',
    sbaScore: s.totalSBAScore,
  }))

  let present = 0
  let absent = 0
  for (const a of attendance) {
    const st = String(a.status || '').toLowerCase()
    if (st === 'present' || st === 'late') present++
    else if (st === 'absent') absent++
  }
  const totalAtt = present + absent

  return {
    role: 'student',
    academicYear: year,
    subjectProgress,
    attendance: {
      present,
      absent,
      rate: totalAtt ? Math.round((present / totalAtt) * 100) : null,
    },
    competencies: competencies.map((c) => ({ code: c.id, name: c.name, category: c.category })),
  }
}
