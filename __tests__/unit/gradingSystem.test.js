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
    expect(normalizeGradeLevel('Form 5')).toBe('form5')
    expect(normalizeGradeLevel('Form 6A')).toBe('form6')
    expect(normalizeGradeLevel('Grade 10')).toBe('grade10')
    expect(normalizeGradeLevel('Grade 10A')).toBe('grade10')
    expect(normalizeGradeLevel('Grade 11B')).toBe('grade11')
    expect(normalizeGradeLevel('10A')).toBe('grade10')
  })
})

describe('getGradingSystem', () => {
  it('uses CBC secondary scale for Forms 1–6 and senior scale for Grade 10+', () => {
    expect(getGradingSystem('Form 1A').name).toContain('CBC')
    expect(getGradingSystem('Form 2A').name).toContain('CBC')
    expect(getGradingSystem('Form 3A').name).toContain('CBC')
    expect(getGradingSystem('Form 4').name).toContain('CBC')
    expect(getGradingSystem('Form 5').name).toContain('CBC')
    expect(getGradingSystem('Form 6A').name).toContain('CBC')
    expect(getGradingSystem('Grade 10A').name).toContain('Senior')
    expect(getGradingSystem('Grade 11').name).toContain('Senior')
  })
})

describe('calculateGrade', () => {
  it('applies ECZ CBC Forms 1–6 bands', () => {
    expect(calculateGrade(100, 'Form 1A')).toMatchObject({
      grade: '1',
      status: 'OUTSTANDING',
    })
    expect(calculateGrade(70, 'Form 2B')).toMatchObject({
      grade: '1',
      status: 'OUTSTANDING',
    })
    expect(calculateGrade(69, 'Form 3')).toMatchObject({ grade: '2', status: 'ADVANCED' })
    expect(calculateGrade(60, 'Form 4A')).toMatchObject({ grade: '2', status: 'ADVANCED' })
    expect(calculateGrade(59, 'Form 5')).toMatchObject({ grade: '3', status: 'BASIC' })
    expect(calculateGrade(50, 'Form 6')).toMatchObject({ grade: '3', status: 'BASIC' })
    expect(calculateGrade(49, 'Form 1')).toMatchObject({
      grade: '4',
      status: 'SATISFACTORY',
    })
    expect(calculateGrade(40, 'Form 2')).toMatchObject({
      grade: '4',
      status: 'SATISFACTORY',
    })
    expect(calculateGrade(39, 'Form 3')).toMatchObject({
      grade: '5',
      status: 'UNSATISFACTORY',
    })
    expect(calculateGrade(0, 'Form 6A')).toMatchObject({
      grade: '5',
      status: 'UNSATISFACTORY',
    })
  })

  it('applies Grade 10–12 senior bands', () => {
    expect(calculateGrade(80, 'Grade 10A')).toMatchObject({ grade: '1', status: 'DISTINCTION' })
    expect(calculateGrade(72, 'Grade 11')).toMatchObject({ grade: '2', status: 'DISTINCTION' })
    expect(calculateGrade(47, 'Grade 12B')).toMatchObject({ grade: '7', status: 'SATISFACTORY' })
    expect(calculateGrade(25, 'Grade 10')).toMatchObject({
      grade: '9',
      status: 'UNSATISFACTORILY',
    })
  })

  it('returns absent for X scores', () => {
    expect(calculateGrade('X', 'Form 1A')).toMatchObject({ grade: 'X', status: 'ABSENT' })
  })
})

describe('getGradeBadgeClasses', () => {
  it('styles official grade labels', () => {
    expect(getGradeBadgeClasses('1')).toContain('success')
    expect(getGradeBadgeClasses('2')).toContain('accent')
    expect(getGradeBadgeClasses('5')).toContain('danger')
    expect(getGradeBadgeClasses('9')).toContain('danger')
    expect(getGradeBadgeClasses('F')).toContain('danger')
  })
})
