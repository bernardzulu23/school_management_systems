import { describe, it, expect } from 'vitest'
import {
  ASSESSMENT_SUBMITTABLE,
  ASSESSMENT_EDITABLE,
  normalizeAssessmentStatus,
} from '@/lib/assessments/review'

describe('assessment HOD review status sets', () => {
  it('allows submit from draft, rejected, revision requested', () => {
    expect(ASSESSMENT_SUBMITTABLE.has('DRAFT')).toBe(true)
    expect(ASSESSMENT_SUBMITTABLE.has('REJECTED')).toBe(true)
    expect(ASSESSMENT_SUBMITTABLE.has('REVISION_REQUESTED')).toBe(true)
    expect(ASSESSMENT_SUBMITTABLE.has('SUBMITTED')).toBe(false)
    expect(ASSESSMENT_SUBMITTABLE.has('PUBLISHED')).toBe(false)
  })

  it('allows edit only in editable statuses', () => {
    expect(ASSESSMENT_EDITABLE.has('DRAFT')).toBe(true)
    expect(ASSESSMENT_EDITABLE.has('PUBLISHED')).toBe(false)
    expect(ASSESSMENT_EDITABLE.has('SUBMITTED')).toBe(false)
  })

  it('normalizes status strings', () => {
    expect(normalizeAssessmentStatus('submitted')).toBe('SUBMITTED')
  })
})
