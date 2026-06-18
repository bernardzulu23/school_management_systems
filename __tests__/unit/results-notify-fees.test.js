import { describe, it, expect } from 'vitest'
import { countFinalizedEnrolledSubjects } from '@/lib/results/checkAndNotifyParent'
import { canUseFeatureForOwnership } from '@/lib/zambiaSchoolFeatures'

describe('countFinalizedEnrolledSubjects', () => {
  it('marks complete when every enrolled subject has a finalized result', () => {
    const result = countFinalizedEnrolledSubjects(
      ['sub1', 'sub2', 'sub3'],
      [
        { subjectId: 'sub1', workflowStatus: 'finalized' },
        { subjectId: 'sub2', workflowStatus: 'finalized' },
        { subjectId: 'sub3', workflowStatus: 'draft' },
      ]
    )
    expect(result.subjectsEnrolled).toBe(3)
    expect(result.subjectsFinalized).toBe(2)
    expect(result.isComplete).toBe(false)
  })

  it('is complete when all enrolled subjects are finalized', () => {
    const result = countFinalizedEnrolledSubjects(
      ['sub1', 'sub2'],
      [
        { subjectId: 'sub1', workflowStatus: 'finalized' },
        { subjectId: 'sub2', workflowStatus: 'FINALIZED' },
      ]
    )
    expect(result.isComplete).toBe(true)
  })
})

describe('canUseFeatureForOwnership', () => {
  it('allows fee management for private schools', () => {
    expect(canUseFeatureForOwnership('PRIVATE', 'fee-management')).toBe(true)
    expect(canUseFeatureForOwnership('private', 'school-fees-management')).toBe(true)
  })

  it('blocks fee management for government schools', () => {
    expect(canUseFeatureForOwnership('GOVERNMENT', 'fee-management')).toBe(false)
  })
})
