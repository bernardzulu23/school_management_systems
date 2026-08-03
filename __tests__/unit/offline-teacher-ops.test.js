import { describe, expect, it } from 'vitest'
import { isLocalLessonPlanId, newLocalLessonPlanId } from '@/lib/offline/teacher-ops'

describe('teacher-ops helpers', () => {
  it('detects local lesson plan ids', () => {
    expect(isLocalLessonPlanId('local:abc')).toBe(true)
    expect(isLocalLessonPlanId(newLocalLessonPlanId())).toBe(true)
    expect(isLocalLessonPlanId('uuid-real')).toBe(false)
  })
})
