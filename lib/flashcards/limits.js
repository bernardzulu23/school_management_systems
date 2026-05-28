export const MAX_CARDS_PER_DECK = 10
export const MIN_CARDS_PER_DECK = 1

/** One deck allowed per subject per calendar day (UTC). */
export function deckDateUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function deckDateKey(date = new Date()) {
  return deckDateUtc(date).toISOString().slice(0, 10)
}

export function validateFlashcards(cards) {
  if (!Array.isArray(cards)) return { ok: false, error: 'cards must be an array' }
  if (cards.length < MIN_CARDS_PER_DECK) {
    return { ok: false, error: `Add at least ${MIN_CARDS_PER_DECK} card` }
  }
  if (cards.length > MAX_CARDS_PER_DECK) {
    return { ok: false, error: `Maximum ${MAX_CARDS_PER_DECK} cards per deck` }
  }
  const normalized = []
  for (let i = 0; i < cards.length; i++) {
    const front = String(cards[i]?.front || '').trim()
    const back = String(cards[i]?.back || '').trim()
    if (!front || !back) {
      return { ok: false, error: `Card ${i + 1} needs front and back text` }
    }
    normalized.push({
      id: String(cards[i]?.id || `card_${i + 1}`),
      front,
      back,
    })
  }
  return { ok: true, cards: normalized }
}
