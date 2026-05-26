/**
 * ECZ assessment rules — central API enforcement layer.
 *
 * Call these from SBA/ECZ route handlers instead of scattering rules in routes.
 * Lower-level helpers live in lib/ecz/ecz-compliance.js.
 *
 * @see docs/ECZ_COMPLIANCE.md
 */

import {
  getSBAWeight,
  getSBASubmissionDeadline,
  getDeadlineStatus,
  validateFormLevelForSBA,
  validateSubmissionDeadline,
  validateZambianContext,
  computeTotalSBAScore,
  SBA_TASK_MARKS,
  SBA_TERM_TEST_MARKS,
  SBA_TOTAL_MARKS,
} from '@/lib/ecz/ecz-compliance'

export {
  getSBAWeight,
  getSBASubmissionDeadline,
  getDeadlineStatus,
  validateFormLevelForSBA,
  validateSubmissionDeadline,
  validateZambianContext,
  computeTotalSBAScore,
  SBA_TASK_MARKS,
  SBA_TERM_TEST_MARKS,
  SBA_TOTAL_MARKS,
}

export const VALID_SBA_FORMS = ['Form 1', 'Form 2', 'Form 3']
export const EXAM_ONLY_FORMS = ['Form 4']

const TERM_WEIGHTS = { 1: 20, 2: 30, 3: 50 }

/**
 * Normalise form input to numeric level (1–4) or null.
 * @param {string|number} form
 */
export function normalizeFormLevel(form) {
  if (form === null || form === undefined || form === '') return null
  const s = String(form).trim()
  const match = s.match(/form\s*(\d)/i)
  if (match) return Number(match[1])
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {string|number} form
 * @returns {{ allowed: boolean, reason: string | null, formLevel?: number }}
 */
export function canCreateSBATask(form) {
  const level = normalizeFormLevel(form)
  if (level === 4) {
    return {
      allowed: false,
      reason:
        'SBA tasks cannot be created for Form 4. ECZ guidelines state that no SBA is administered in Form 4 (the year of examination).',
    }
  }
  if (level === null || ![1, 2, 3].includes(level)) {
    const label = String(form || '').trim() || 'unknown'
    if (EXAM_ONLY_FORMS.includes(label)) {
      return {
        allowed: false,
        reason: `SBA tasks cannot be created for ${label}. ECZ guidelines state that no SBA is administered in Form 4.`,
      }
    }
    return {
      allowed: false,
      reason: `Invalid form level: ${label}. SBA is only for Forms 1, 2, and 3.`,
    }
  }
  return { allowed: true, reason: null, formLevel: level }
}

/**
 * @param {number} term
 * @returns {number | null}
 */
export function getTermWeight(term) {
  return TERM_WEIGHTS[Number(term)] ?? null
}

/**
 * Validate per-task SBA score components (ECZ: 20+20+20+40 = 100).
 * @param {{ task1Score?: number|null, task2Score?: number|null, task3Score?: number|null, termTestScore?: number|null }} scores
 */
export function validateSBAScore({ task1Score, task2Score, task3Score, termTestScore }) {
  const errors = []

  const check = (value, max, label) => {
    if (value === null || value === undefined) return
    const n = Number(value)
    if (Number.isNaN(n) || n < 0 || n > max) {
      errors.push(`${label} score must be 0-${max}`)
    }
  }

  check(task1Score, SBA_TASK_MARKS, 'Task 1')
  check(task2Score, SBA_TASK_MARKS, 'Task 2')
  check(task3Score, SBA_TASK_MARKS, 'Task 3')
  check(termTestScore, SBA_TERM_TEST_MARKS, 'Term test')

  const total = computeTotalSBAScore({
    task1Score: task1Score ?? 0,
    task2Score: task2Score ?? 0,
    task3Score: task3Score ?? 0,
    termTestScore: termTestScore ?? 0,
  })

  if (total > SBA_TOTAL_MARKS) {
    errors.push(`Total score ${total} exceeds maximum of ${SBA_TOTAL_MARKS}`)
  }

  return { valid: errors.length === 0, errors, total }
}

/**
 * Look up official SBA/exam weights from seeded EczSubjectConstruct (falls back to getSBAWeight).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} subjectName
 */
export async function getSubjectWeightsFromReference(prisma, subjectName) {
  const name = String(subjectName || '').trim()
  const row = await prisma.eczSubjectConstruct.findUnique({
    where: { subjectName: name },
  })
  if (row) {
    return { sbaWeight: row.sbaWeight, examWeight: row.examWeight }
  }
  const sbaWeight = getSBAWeight(name)
  return { sbaWeight, examWeight: 100 - sbaWeight }
}
