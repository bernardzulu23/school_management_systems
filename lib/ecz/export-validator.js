/**
 * ECZ SBA export validation before submission.
 * @see docs/ECZ_COMPLIANCE.md
 */

import { getSBASubmissionDeadline } from '@/lib/ecz/ecz-compliance'
import { canCreateSBATask } from '@/lib/middleware/ecz-validation'

const PE_SUBJECT_NAMES = ['Physical Education and Sport', 'Physical Education', 'PE']

/**
 * @param {object} params
 * @param {object} [params.submission]
 * @param {Array<{ studentId: string, studentName?: string, learnerNumber?: string, total?: number, remarks?: string }>} params.scores
 * @param {Array<{ id: string, name: string }>} params.enrolledStudents
 * @param {string} params.subject
 * @param {string|number} params.form
 * @param {number} params.academicYear
 * @param {Date} [params.now]
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateECZExport({
  submission = {},
  scores = [],
  enrolledStudents = [],
  subject = '',
  form,
  academicYear,
  now = new Date(),
}) {
  const errors = []
  const warnings = []

  const formLabel = String(form || '').trim()
  const formGate = canCreateSBATask(formLabel)
  if (!formGate.allowed) {
    errors.push(formGate.reason || 'Form 4 learners do not have SBA.')
  }

  const year = Number(academicYear) || new Date().getFullYear()
  const deadline = getSBASubmissionDeadline(year)
  if (deadline && now > deadline) {
    errors.push(
      `ECZ submission deadline has passed (31 January ${year + 1}). Contact ECZ directly for late submissions.`
    )
  }

  const scoredIds = new Set(scores.map((s) => String(s.studentId)))
  const missingScores = enrolledStudents.filter((s) => !scoredIds.has(String(s.id)))
  if (missingScores.length > 0) {
    const names = missingScores
      .slice(0, 8)
      .map((s) => s.name)
      .join(', ')
    errors.push(
      `${missingScores.length} enrolled learner(s) have no SBA scores: ${names}${missingScores.length > 8 ? '…' : ''}`
    )
  }

  const missingNumbers = scores.filter((s) => !String(s.learnerNumber || '').trim())
  if (missingNumbers.length > 0) {
    warnings.push(
      `${missingNumbers.length} learner(s) have no ECZ learner number. Add these before submission.`
    )
  }

  for (const score of scores) {
    const total = Number(score.total)
    if (!Number.isFinite(total) || total < 0 || total > 100) {
      errors.push(
        `${score.studentName || score.studentId}: total score ${score.total} is outside 0–100 range.`
      )
    }
  }

  const isPE = PE_SUBJECT_NAMES.some((n) => String(subject || '').toLowerCase() === n.toLowerCase())
  const weight = submission?.sbaWeight ?? submission?.weight
  if (isPE && weight != null && Number(weight) !== 40) {
    warnings.push('Physical Education SBA weight should be 40%, not 30%. Verify this is correct.')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Format scores for ECZ CSV / print layout.
 * @param {Array<{ studentName: string, learnerNumber?: string, total: number, remarks?: string }>} scores
 */
export function formatForECZSubmission(scores) {
  return scores.map((score, index) => ({
    sn: index + 1,
    learnerName: score.studentName || '',
    learnerNumber: score.learnerNumber || '',
    sbaScore: Math.round(Number(score.total) || 0),
    remarks: score.remarks || '',
  }))
}
