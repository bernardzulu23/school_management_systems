import { describe, it, expect } from 'vitest'
import { classifyTeacherDomains, termDateRange } from '@/lib/compliance/teacherCompliance'

describe('classifyTeacherDomains', () => {
  it('flags missing assessments', () => {
    const domains = classifyTeacherDomains({
      userId: 'u1',
      hasAssessment: false,
      resultCount: 5,
      resultsWithFeedback: 2,
      hasEczActivity: true,
      hasAttendanceToday: true,
    })
    expect(domains.assessments).toBe('missing')
    expect(domains.results).toBe('ok')
  })

  it('flags missing result feedback when results exist without comments', () => {
    const domains = classifyTeacherDomains({
      userId: 'u1',
      hasAssessment: true,
      resultCount: 3,
      resultsWithFeedback: 0,
      hasEczActivity: true,
      hasAttendanceToday: true,
    })
    expect(domains.results).toBe('ok')
    expect(domains.results_feedback).toBe('no_feedback')
  })

  it('marks compliant teacher as ok across domains', () => {
    const domains = classifyTeacherDomains({
      userId: 'u1',
      hasAssessment: true,
      resultCount: 2,
      resultsWithFeedback: 1,
      hasEczActivity: true,
      hasAttendanceToday: true,
    })
    expect(domains.assessments).toBe('ok')
    expect(domains.results_feedback).toBe('ok')
    expect(domains.attendance).toBe('ok')
  })
})

describe('termDateRange', () => {
  it('returns Term 1 window for January', () => {
    const { start, end } = termDateRange('Term 1', '2026')
    expect(start.getMonth()).toBe(0)
    expect(end.getMonth()).toBe(3)
  })
})
