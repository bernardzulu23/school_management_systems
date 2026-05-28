import { z } from 'zod'

/** Structured term report for generateObject. */
export const TermReportSchema = z.object({
  report: z.object({
    opening: z.string(),
    academicProgress: z.string(),
    attendanceComment: z.string(),
    conductAndParticipation: z.string(),
    recommendations: z.string(),
    closing: z.string(),
  }),
  metrics: z.object({
    attendancePercent: z.number().min(0).max(100).optional(),
    sbaAverage: z.number().min(0).max(100).optional(),
    overallGrade: z.string().optional(),
  }),
})

/**
 * @param {object} input
 */
export function buildTermReportPrompt(input) {
  return `Generate an end-of-term school report for a Zambian CBC secondary school.

Student: ${input.studentName}
Class: ${input.className}
Term: ${input.term}
Academic year: ${input.academicYear}

Attendance summary: ${input.attendanceSummary || 'Not available'}
SBA / assessment summary: ${input.sbaSummary || 'Not available'}
Recent subjects and grades: ${input.gradesSummary || 'Not available'}

Write professionally for parents. Use Zambian school tone. Be encouraging but honest.
Return JSON matching the schema only.`
}
