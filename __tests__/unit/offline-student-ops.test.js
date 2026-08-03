import { describe, expect, it } from 'vitest'
import { isLocalGoalId, newLocalGoalId } from '@/lib/offline/student-ops'

describe('student-ops helpers', () => {
  it('detects local goal ids', () => {
    expect(isLocalGoalId('local:abc')).toBe(true)
    expect(isLocalGoalId(newLocalGoalId())).toBe(true)
    expect(isLocalGoalId('uuid-real')).toBe(false)
  })
})
