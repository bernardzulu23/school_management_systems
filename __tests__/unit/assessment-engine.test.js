import { describe, it, expect } from 'vitest'
import {
  resolveAssessmentMode,
  ASSESSMENT_MODES,
  validateExamItem,
  validateBloomDistribution,
  normalizeQuestionsForMode,
  salvageQuestionsForMode,
  allowsMultipleChoice,
  getAllowedQuestionTypes,
  isSecondaryFormLevel,
} from '@/lib/ecz/assessment-engine'

describe('resolveAssessmentMode', () => {
  it('returns primary_mcq for primary schools', () => {
    expect(resolveAssessmentMode({ schoolLevel: 'primary' })).toBe(ASSESSMENT_MODES.PRIMARY_MCQ)
  })

  it('returns secondary_scenario for secondary schools', () => {
    expect(resolveAssessmentMode({ schoolLevel: 'secondary' })).toBe(
      ASSESSMENT_MODES.SECONDARY_SCENARIO
    )
  })

  it('returns sba_rubric when purpose is sba', () => {
    expect(resolveAssessmentMode({ schoolLevel: 'secondary', purpose: 'sba' })).toBe(
      ASSESSMENT_MODES.SBA_RUBRIC
    )
  })

  it('uses grade level for combined schools', () => {
    expect(resolveAssessmentMode({ schoolLevel: 'combined', gradeLevel: 'Grade 4' })).toBe(
      ASSESSMENT_MODES.PRIMARY_MCQ
    )
    expect(resolveAssessmentMode({ schoolLevel: 'combined', gradeLevel: 'Form 2' })).toBe(
      ASSESSMENT_MODES.SECONDARY_SCENARIO
    )
  })
})

describe('validateExamItem', () => {
  it('blocks MCQ for secondary scenario mode', () => {
    const result = validateExamItem(
      { type: 'mcq', question: 'What is photosynthesis?' },
      ASSESSMENT_MODES.SECONDARY_SCENARIO
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/Multiple choice/i)
  })

  it('requires Zambian context when option set', () => {
    const result = validateExamItem(
      {
        type: 'structured',
        question: 'Explain the water cycle in detail for learners.',
        zambianScenario: 'A farmer in Mkushi observes soil erosion after heavy rains.',
      },
      ASSESSMENT_MODES.SECONDARY_SCENARIO,
      { requireZambianContext: true }
    )
    expect(result.ok).toBe(true)
  })
})

describe('normalizeQuestionsForMode', () => {
  it('strips MCQ from secondary outputs', () => {
    const out = normalizeQuestionsForMode(
      [
        { type: 'mcq', question: 'A' },
        { type: 'structured', question: 'B' },
      ],
      ASSESSMENT_MODES.SECONDARY_SCENARIO
    )
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('structured')
  })
})

describe('salvageQuestionsForMode', () => {
  it('converts MCQ-only secondary quizzes instead of returning empty', () => {
    const out = salvageQuestionsForMode(
      [
        { type: 'mcq', question: 'Pick one', options: ['A', 'B'], answer: 'A' },
        { type: 'mcq', question: 'Pick two', options: ['C', 'D'], answer: 'C' },
      ],
      ASSESSMENT_MODES.SECONDARY_SCENARIO
    )
    expect(out).toHaveLength(2)
    expect(out.every((q) => q.type === 'short')).toBe(true)
  })
})

describe('resolveAssessmentMode formative', () => {
  it('keeps MCQ-friendly mode for quiz maker even at secondary schools', () => {
    expect(
      resolveAssessmentMode({
        schoolLevel: 'secondary',
        gradeLevel: 'Form 3',
        purpose: 'formative',
      })
    ).toBe(ASSESSMENT_MODES.PRIMARY_MCQ)
  })
})

describe('validateBloomDistribution', () => {
  it('warns when distribution is far from ECSEOL targets', () => {
    const result = validateBloomDistribution([
      { bloomsLevel: 'Remembering', marks: 90 },
      { bloomsLevel: 'Understanding', marks: 10 },
    ])
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('helpers', () => {
  it('allows MCQ only in primary mode', () => {
    expect(allowsMultipleChoice(ASSESSMENT_MODES.PRIMARY_MCQ)).toBe(true)
    expect(allowsMultipleChoice(ASSESSMENT_MODES.SECONDARY_SCENARIO)).toBe(false)
  })

  it('detects secondary form levels', () => {
    expect(isSecondaryFormLevel('Form 3')).toBe(true)
    expect(isSecondaryFormLevel('Grade 4')).toBe(false)
  })

  it('returns allowed types per mode', () => {
    expect(getAllowedQuestionTypes(ASSESSMENT_MODES.PRIMARY_MCQ)).toContain('mcq')
    expect(getAllowedQuestionTypes(ASSESSMENT_MODES.SECONDARY_SCENARIO)).not.toContain('mcq')
  })
})
