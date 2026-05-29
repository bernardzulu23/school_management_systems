import { describe, it, expect } from 'vitest'
import { scoreQuestion, scoreMockExam } from '@/lib/assessment/auto-scorer'

describe('scoreQuestion', () => {
  it('scores MCQ exact match', () => {
    const q = {
      id: '1',
      type: 'mcq',
      question: 'What is 2+2?',
      options: ['3', '4', '5'],
      marks: 2,
      answer: '4',
    }
    expect(scoreQuestion(q, '4').awarded).toBe(2)
    expect(scoreQuestion(q, '5').awarded).toBe(0)
  })

  it('scores numeric answers with tolerance', () => {
    const q = {
      id: '2',
      type: 'short',
      question: 'Calculate the area',
      marks: 4,
      answer: '42.0 cm²',
    }
    expect(scoreQuestion(q, '42 cm2').awarded).toBe(4)
  })

  it('flags explain questions for review', () => {
    const q = {
      id: '3',
      type: 'structured',
      question: 'Explain the water cycle in Zambia',
      marks: 6,
      answer:
        'Evaporation from lakes and rivers leads to condensation and rainfall across the catchment areas supporting agriculture.',
    }
    const result = scoreQuestion(q, 'Rain comes from clouds')
    expect(result.needsReview).toBe(true)
  })
})

describe('scoreMockExam', () => {
  it('aggregates marks and percentage', () => {
    const paper = {
      questions: [
        { id: 'a', type: 'mcq', question: 'Q1', options: ['A', 'B'], marks: 2, answer: 'A' },
        { id: 'b', type: 'short', question: 'Q2', marks: 2, answer: 'Lusaka' },
      ],
    }
    const result = scoreMockExam(paper, { a: 'A', b: 'Lusaka' })
    expect(result.totalMarks).toBe(4)
    expect(result.awardedMarks).toBe(4)
    expect(result.percentage).toBe(100)
    expect(result.scoreBucket).toBe(90)
    expect(result.status).toBe('graded')
  })
})
