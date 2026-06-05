import { isFlashcardAnswerCorrect, resolveFlashcardAnswer } from '@/lib/flashcards/resolveAnswer'

/**
 * @param {Array<{ id: string, front: string, answer: string, options?: string[], explanation?: string }>} cards
 * @param {Record<string, string>} answers cardId -> selected option
 */
export function scoreFlashcardSession(cards, answers) {
  const list = Array.isArray(cards) ? cards : []
  const results = list.map((card) => {
    const selected = answers[card.id]
    const correct = selected ? isFlashcardAnswerCorrect(selected, card.options, card.answer) : false
    return {
      cardId: card.id,
      question: card.front,
      selected: selected || null,
      correctAnswer: resolveFlashcardAnswer(card.options, card.answer),
      isCorrect: correct,
      explanation: card.explanation || '',
    }
  })

  const correctCount = results.filter((r) => r.isCorrect).length
  const total = list.length
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0

  return {
    correctCount,
    total,
    percent,
    rating: ratingFromPercent(percent),
    results,
    missed: results.filter((r) => !r.isCorrect),
  }
}

export function ratingFromPercent(percent) {
  if (percent >= 90) return { label: 'Excellent', stars: 5, band: 'A' }
  if (percent >= 75) return { label: 'Good', stars: 4, band: 'B' }
  if (percent >= 60) return { label: 'Fair', stars: 3, band: 'C' }
  if (percent >= 40) return { label: 'Needs practice', stars: 2, band: 'D' }
  return { label: 'Keep studying', stars: 1, band: 'E' }
}
