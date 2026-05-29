import { describe, it, expect } from 'vitest'
import { sanitizePaperForStudent, computePercentile, buildScoreDistribution } from '@/lib/mock-exam'

describe('sanitizePaperForStudent', () => {
  it('removes model answers from questions', () => {
    const paper = {
      examInfo: { subject: 'Math', totalMarks: 10 },
      questions: [
        {
          id: '1',
          type: 'short',
          question: 'Define algebra',
          marks: 5,
          answer: 'Branch of mathematics',
          explanation: 'secret',
        },
      ],
    }
    const safe = sanitizePaperForStudent(paper)
    expect(safe.questions[0].answer).toBeUndefined()
    expect(safe.questions[0].explanation).toBeUndefined()
    expect(safe.questions[0].question).toBe('Define algebra')
  })
})

describe('computePercentile', () => {
  it('returns null percentile when no peer data', () => {
    const out = computePercentile(80, [])
    expect(out.percentile).toBeNull()
  })

  it('computes rank against peers', () => {
    const peers = [40, 50, 60, 70, 80, 90]
    const out = computePercentile(85, peers)
    expect(out.percentile).toBeGreaterThan(50)
    expect(out.sampleSize).toBe(6)
  })
})

describe('buildScoreDistribution', () => {
  it('buckets percentages into 10-point bands', () => {
    const dist = buildScoreDistribution([5, 15, 55, 95])
    expect(dist['0-10']).toBe(1)
    expect(dist['10-20']).toBe(1)
    expect(dist['50-60']).toBe(1)
    expect(dist['90-100']).toBe(1)
  })
})
