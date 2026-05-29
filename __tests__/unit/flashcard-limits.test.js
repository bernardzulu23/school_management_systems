import { describe, it, expect } from 'vitest'
import { validateFlashcards, MAX_CARDS_PER_DECK } from '@/lib/flashcards/limits'

/** Build a valid quiz-style card (question + options + answer). */
function quizCard(i) {
  return {
    question: `Q${i}`,
    options: [`A${i}`, `B${i}`, `C${i}`],
    answer: `A${i}`,
    explanation: `Because A${i}`,
  }
}

describe('flashcard limits', () => {
  it('allows up to 10 quiz cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) => quizCard(i))
    const result = validateFlashcards(cards)
    expect(result.ok).toBe(true)
    expect(result.cards).toHaveLength(10)
  })

  it('trims more than 10 cards down to the max', () => {
    const cards = Array.from({ length: 11 }, (_, i) => quizCard(i))
    const result = validateFlashcards(cards)
    expect(result.ok).toBe(true)
    expect(result.cards).toHaveLength(MAX_CARDS_PER_DECK)
  })

  it('rejects a card missing options', () => {
    const result = validateFlashcards([{ question: 'Q', answer: 'A' }])
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/options/i)
  })
})
