import { describe, expect, it } from 'vitest'
import {
  calculateGrade,
  getGradingSystem,
  getGradeBadgeClasses,
  normalizeGradeLevel,
} from '@/lib/gradingSystem'

describe('normalizeGradeLevel', () => {
  it('maps real class labels to the correct grading keys', () => {
    expect(normalizeGradeLevel('Form 1A')).toBe('form1')
    expect(normalizeGradeLevel('Form 2B')).toBe('form2')
    expect(normalizeGradeLevel('Form 3')).toBe('form3')
    expect(normalizeGradeLevel('Form 4A')).toBe('form4')
    expect(normalizeGradeLevel('Grade 10')).toBe('grade10')
    expect(normalizeGradeLevel('Grade 10A')).toBe('grade10')
    expect(normalizeGradeLevel('Grade 11B')).toBe('grade11')
    expect(normalizeGradeLevel('10A')).toBe('grade10')
  })
})

describe('getGradingSystem', () => {
  it('uses junior scales for Form 1–2 and senior scales for Form 3+ and Grade 10+', () => {
    expect(getGradingSystem('Form 1A').name).toContain('Junior')
    expect(getGradingSystem('Form 2A').name).toContain('Junior')
    expect(getGradingSystem('Form 3A').name).toContain('Senior')
    expect(getGradingSystem('Form 4').name).toContain('Senior')
    expect(getGradingSystem('Grade 10A').name).toContain('Senior')
    expect(getGradingSystem('Grade 11').name).toContain('Senior')
  })
})

describe('calculateGrade', () => {
  it('applies Form 1–2 junior bands', () => {
    expect(calculateGrade(80, 'Form 1A')).toMatchObject({ grade: 'ONE', status: 'DISTINCTION' })
    expect(calculateGrade(65, 'Form 2B')).toMatchObject({ grade: 'TWO', status: 'MERIT' })
    expect(calculateGrade(45, 'Form 1')).toMatchObject({ grade: 'FOUR', status: 'PASS' })
    expect(calculateGrade(30, 'Form 2')).toMatchObject({ grade: 'F', status: 'FAIL' })
  })

  it('applies Grade 10–12 senior bands', () => {
    expect(calculateGrade(80, 'Grade 10A')).toMatchObject({ grade: '1', status: 'DISTINCTION' })
    expect(calculateGrade(72, 'Grade 11')).toMatchObject({ grade: '2', status: 'DISTINCTION' })
    expect(calculateGrade(47, 'Grade 12B')).toMatchObject({ grade: '7', status: 'SATISFACTORY' })
    expect(calculateGrade(25, 'Grade 10')).toMatchObject({ grade: '9', status: 'UNSATISFACTORILY' })
  })

  it('returns absent for X scores', () => {
    expect(calculateGrade('X', 'Form 1A')).toMatchObject({ grade: 'X', status: 'ABSENT' })
  })
})

describe('getGradeBadgeClasses', () => {
  it('styles official grade labels', () => {
    expect(getGradeBadgeClasses('ONE')).toContain('success')
    expect(getGradeBadgeClasses('1')).toContain('success')
    expect(getGradeBadgeClasses('9')).toContain('danger')
    expect(getGradeBadgeClasses('F')).toContain('danger')
  })
})
