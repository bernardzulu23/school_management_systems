import { resolveFlashcardAnswer } from '@/lib/flashcards/resolveAnswer'

export const MAX_CARDS_PER_DECK = 10
export const MIN_CARDS_PER_DECK = 1

/** One deck allowed per subject per calendar day (UTC). */
export function deckDateUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function deckDateKey(date = new Date()) {
  return deckDateUtc(date).toISOString().slice(0, 10)
}

/**
 * Normalize AI-generated quiz-style flashcards.
 * Each card hides its answer until the student selects an option.
 */
export function validateFlashcards(cards) {
  if (!Array.isArray(cards)) return { ok: false, error: 'cards must be an array' }
  if (cards.length < MIN_CARDS_PER_DECK) {
    return { ok: false, error: `Need at least ${MIN_CARDS_PER_DECK} card` }
  }
  const trimmed = cards.slice(0, MAX_CARDS_PER_DECK)
  const normalized = []
  for (let i = 0; i < trimmed.length; i++) {
    const card = trimmed[i]
    const front = String(card?.front || card?.question || '').trim()
    const options = Array.isArray(card?.options)
      ? card.options.map((o) => String(o).trim()).filter(Boolean)
      : []
    const rawAnswer = String(card?.answer || card?.back || '').trim()
    if (!front || !rawAnswer || options.length < 2) {
      return { ok: false, error: `Card ${i + 1} needs a question, options and an answer` }
    }

    const answer = resolveFlashcardAnswer(options, rawAnswer)
    const answerInOptions = options.some(
      (o) =>
        String(o).trim().toLowerCase() ===
        String(answer || '')
          .trim()
          .toLowerCase()
    )
    if (!answer || !answerInOptions) {
      return {
        ok: false,
        error: `Card ${i + 1} answer must match one of the options (got "${rawAnswer}")`,
      }
    }

    normalized.push({
      id: String(card?.id || `card_${i + 1}`),
      front,
      options: options.slice(0, 4),
      answer,
      explanation: String(card?.explanation || '').trim(),
    })
  }
  return { ok: true, cards: normalized }
}
