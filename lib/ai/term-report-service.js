/**
 * Generate and persist AI term reports (Phase 3 P3.4).
 */
import prisma from '@/lib/prisma'
import { generateAIObject } from '@/lib/ai/client'
import { TermReportSchema, buildTermReportPrompt } from '@/lib/ai/term-report-schema'

/**
 * @param {object} params
 * @param {string} params.schoolId
 * @param {string} params.studentId
 * @param {number} params.term
 * @param {number} params.academicYear
 * @param {string} [params.generatedById]
 */
export async function generateTermReportForStudent(params) {
  const { schoolId, studentId, term, academicYear, generatedById } = params

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      class: true,
      classId: true,
    },
  })
  if (!student) throw new Error('Student not found')

  const year = Number(academicYear)
  const termNum = Number(term)

  const [attendanceRows, sbaScores, results] = await Promise.all([
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
    prisma.eczAssessmentScore.findMany({
      where: { schoolId, studentId, academicYear: year },
      select: {
        totalSBAScore: true,
        assessment: { select: { subject: { select: { name: true } } } },
      },
    }),
    prisma.result.findMany({
      where: { schoolId, studentId, year: String(year) },
      select: { subject: true, grade: true, percentage: true, term: true },
      take: 20,
    }),
  ])

  let present = 0
  let totalAtt = attendanceRows.length
  for (const a of attendanceRows) {
    const s = String(a.status || '').toLowerCase()
    if (s === 'present' || s === 'late') present++
  }
  const attendancePct = totalAtt ? Math.round((present / totalAtt) * 100) : null

  const sbaAvg =
    sbaScores.length > 0
      ? Math.round(
          sbaScores.reduce((acc, s) => acc + (Number(s.totalSBAScore) || 0), 0) / sbaScores.length
        )
      : null

  const attendanceSummary =
    attendancePct != null
      ? `${attendancePct}% attendance (${present}/${totalAtt} days marked)`
      : 'No attendance records'

  const sbaSummary =
    sbaScores.length > 0
      ? sbaScores
          .map((s) => `${s.assessment?.subject?.name || 'Subject'}: ${s.totalSBAScore}%`)
          .join('; ')
      : 'No SBA scores recorded'

  const gradesSummary =
    results.length > 0
      ? results.map((r) => `${r.subject}: ${r.grade || r.percentage}%`).join('; ')
      : 'No formal results yet'

  const prompt = buildTermReportPrompt({
    studentName: student.name,
    className: student.class,
    term: termNum,
    academicYear: year,
    attendanceSummary,
    sbaSummary,
    gradesSummary,
  })

  const { object } = await generateAIObject(
    TermReportSchema,
    'You are a Zambian school head of department writing term reports for parents.',
    prompt,
    { maxTokens: 2000, temperature: 0.35 }
  )

  const narrative = [
    object.report.opening,
    object.report.academicProgress,
    object.report.attendanceComment,
    object.report.conductAndParticipation,
    object.report.recommendations,
    object.report.closing,
  ].join('\n\n')

  const report = await prisma.termReport.upsert({
    where: {
      schoolId_studentId_term_academicYear: {
        schoolId,
        studentId,
        term: termNum,
        academicYear: year,
      },
    },
    create: {
      schoolId,
      studentId,
      term: termNum,
      academicYear: year,
      classId: student.classId,
      content: object,
      narrative,
      attendancePct: object.metrics?.attendancePercent ?? attendancePct,
      sbaAverage: object.metrics?.sbaAverage ?? sbaAvg,
      status: 'PENDING_HOD_REVIEW',
      generatedById: generatedById || null,
    },
    update: {
      content: object,
      narrative,
      attendancePct: object.metrics?.attendancePercent ?? attendancePct,
      sbaAverage: object.metrics?.sbaAverage ?? sbaAvg,
      status: 'PENDING_HOD_REVIEW',
      generatedById: generatedById || null,
    },
  })

  return report
}
