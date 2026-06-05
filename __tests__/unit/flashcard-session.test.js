import { describe, it, expect } from 'vitest'
import { scoreFlashcardSession, ratingFromPercent } from '@/lib/flashcards/scoreSession'

describe('flashcard session scoring', () => {
  const cards = [
    {
      id: 'c1',
      front: 'Q1',
      options: ['A', 'B'],
      answer: 'A',
    },
    {
      id: 'c2',
      front: 'Q2',
      options: ['X', 'Y'],
      answer: 'Y',
    },
  ]

  it('scores correct answers', () => {
    const result = scoreFlashcardSession(cards, { c1: 'A', c2: 'Y' })
    expect(result.correctCount).toBe(2)
    expect(result.percent).toBe(100)
    expect(result.rating.label).toBe('Excellent')
  })

  it('tracks missed questions', () => {
    const result = scoreFlashcardSession(cards, { c1: 'B', c2: 'Y' })
    expect(result.correctCount).toBe(1)
    expect(result.missed).toHaveLength(1)
    expect(result.missed[0].cardId).toBe('c1')
  })

  it('maps percent to rating bands', () => {
    expect(ratingFromPercent(95).stars).toBe(5)
    expect(ratingFromPercent(50).stars).toBe(2)
  })
})
