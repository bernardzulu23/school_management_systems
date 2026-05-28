import { describe, it, expect } from 'vitest'
import { validateFlashcards, MAX_CARDS_PER_DECK } from '@/lib/flashcards/limits'

describe('flashcard limits', () => {
  it('allows up to 10 cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      front: `Q${i}`,
      back: `A${i}`,
    }))
    const result = validateFlashcards(cards)
    expect(result.ok).toBe(true)
    expect(result.cards).toHaveLength(10)
  })

  it('rejects more than 10 cards', () => {
    const cards = Array.from({ length: 11 }, (_, i) => ({
      front: `Q${i}`,
      back: `A${i}`,
    }))
    const result = validateFlashcards(cards)
    expect(result.ok).toBe(false)
    expect(result.error).toContain(String(MAX_CARDS_PER_DECK))
  })
})
