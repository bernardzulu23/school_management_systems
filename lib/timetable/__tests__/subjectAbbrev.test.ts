import { describe, expect, it } from 'vitest'
import { abbreviateSubject } from '@/lib/timetable/subjectAbbrev'

describe('abbreviateSubject', () => {
  it('uses known mappings', () => {
    expect(abbreviateSubject('Mathematics')).toBe('Ma')
    expect(abbreviateSubject('English Language')).toBe('En')
  })

  it('prefers subject code when short', () => {
    expect(abbreviateSubject('Mathematics', 'MATH')).toBe('MA')
  })

  it('falls back to two letters from multi-word names', () => {
    expect(abbreviateSubject('Home Economics')).toBe('HE')
  })
})
