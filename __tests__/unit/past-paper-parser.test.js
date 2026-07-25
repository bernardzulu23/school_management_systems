import { describe, expect, it } from 'vitest'
import {
  detectChoiceRule,
  parsePastPaperCover,
  parsePastPaperSections,
} from '@/lib/curriculum/pastPaperParser'

describe('pastPaperParser', () => {
  it('detects answer any four questions', () => {
    expect(detectChoiceRule('Answer any four questions from this section')).toEqual({
      choiceRule: 'answer_n_of_m',
      chooseCount: 4,
    })
  })

  it('parses cover metadata', () => {
    const cover = parsePastPaperCover(
      'MATHEMATICS 4024/2\nNovember 2019\nTime: 150 minutes\n100 marks\nCalculator is allowed. Formula sheet provided.'
    )
    expect(cover.paperCode).toBe('4024')
    expect(cover.paperNumber).toBe(2)
    expect(cover.year).toBe(2019)
    expect(cover.calculatorAllowed).toBe(true)
    expect(cover.formulaSheetProvided).toBe(true)
  })

  it('parses Section A/B headers', () => {
    const sections = parsePastPaperSections(
      'Section A (52 Marks)\nQuestion 1\nQuestion 2\nAnswer all questions.\nSection B [48 marks]\nAnswer any four questions.\nQuestion 9\nQuestion 10'
    )
    expect(sections).toHaveLength(2)
    expect(sections[0].sectionLabel).toBe('Section A')
    expect(sections[0].choiceRule).toBe('answer_all')
    expect(sections[1].choiceRule).toBe('answer_n_of_m')
    expect(sections[1].chooseCount).toBe(4)
  })
})
