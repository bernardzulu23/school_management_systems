import { describe, expect, it } from 'vitest'
import { toCdcFormNumber, toCurriculumGradeArg } from '@/lib/ai/curriculum-context'

describe('toCurriculumGradeArg', () => {
  it('preserves Grade labels (does not rewrite Grade 10 → Form 10)', () => {
    expect(toCurriculumGradeArg('Grade 10')).toBe('Grade 10')
    expect(toCurriculumGradeArg('grade10')).toBe('Grade 10')
    expect(toCurriculumGradeArg('Grade 7')).toBe('Grade 7')
  })

  it('normalizes form tokens to Form N', () => {
    expect(toCurriculumGradeArg('form1')).toBe('Form 1')
    expect(toCurriculumGradeArg('Form 2')).toBe('Form 2')
  })
})

describe('toCdcFormNumber', () => {
  it('maps senior grades onto secondary Form numbers for CDC corpora', () => {
    expect(toCdcFormNumber('Grade 8')).toBe(1)
    expect(toCdcFormNumber('Grade 9')).toBe(2)
    expect(toCdcFormNumber('Grade 10')).toBe(3)
    expect(toCdcFormNumber('Grade 11')).toBe(4)
    expect(toCdcFormNumber('Grade 12')).toBe(4)
  })

  it('keeps Form numbers as-is', () => {
    expect(toCdcFormNumber('Form 1')).toBe(1)
    expect(toCdcFormNumber('form3')).toBe(3)
  })
})
