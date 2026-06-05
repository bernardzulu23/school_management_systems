import { describe, it, expect } from 'vitest'
import {
  fallbackQuizClassAnalysis,
  aggregateWrongAnswers,
} from '@/lib/assessments/generateQuizClassAnalysis'

describe('fallbackQuizClassAnalysis', () => {
  it('recommends re-teach when class average is low', () => {
    const result = fallbackQuizClassAnalysis({
      assessment: { title: 'Fractions quiz', subject: 'Math', topic: 'Fractions', class: 'Form 2' },
      stats: { classSize: 30, attempted: 25, averagePercentage: 52, needsSupportCount: 12 },
      wrongAnswers: [
        { question: 'Add fractions', wrongCount: 10, totalAttempts: 25, wrongRate: 0.4 },
      ],
    })
    expect(result.recommendReteach).toBe(true)
    expect(result.reteachRationale).toContain('65%')
  })

  it('does not recommend re-teach when class performs well', () => {
    const result = fallbackQuizClassAnalysis({
      assessment: { title: 'Algebra', subject: 'Math', topic: 'Algebra', class: 'Form 3' },
      stats: { classSize: 28, attempted: 28, averagePercentage: 82, needsSupportCount: 2 },
      wrongAnswers: [],
    })
    expect(result.recommendReteach).toBe(false)
  })
})

describe('aggregateWrongAnswers', () => {
  it('counts incorrect responses per question', () => {
    const submissions = [
      {
        content: JSON.stringify({
          review: [
            { id: 'q1', isCorrect: false, question: 'Q1' },
            { id: 'q2', isCorrect: true, question: 'Q2' },
          ],
        }),
      },
      {
        content: JSON.stringify({
          review: [
            { id: 'q1', isCorrect: false, question: 'Q1' },
            { id: 'q2', isCorrect: true, question: 'Q2' },
          ],
        }),
      },
    ]
    const agg = aggregateWrongAnswers(submissions, [{ id: 'q1', question: 'Q1' }])
    expect(agg[0].wrongCount).toBe(2)
    expect(agg[0].wrongRate).toBeGreaterThan(0)
  })
})
