/**
 * Resolve a flashcard answer to the canonical option string.
 * AI often returns "A" while options hold full text — map letters/indexes to option text.
 *
 * @param {string[]} options
 * @param {string} answer
 * @returns {string|null}
 */
export function resolveFlashcardAnswer(options, answer) {
  const opts = (Array.isArray(options) ? options : []).map((o) => String(o).trim()).filter(Boolean)
  const raw = String(answer || '').trim()
  if (!raw || !opts.length) return null

  const exact = opts.find((o) => o.toLowerCase() === raw.toLowerCase())
  if (exact) return exact

  if (/^[A-Da-d]$/.test(raw)) {
    const idx = raw.toUpperCase().charCodeAt(0) - 65
    if (idx >= 0 && idx < opts.length) return opts[idx]
  }

  if (/^[1-9]\d*$/.test(raw)) {
    const idx = parseInt(raw, 10) - 1
    if (idx >= 0 && idx < opts.length) return opts[idx]
  }

  return raw
}

/**
 * @param {string} selected
 * @param {string[]} options
 * @param {string} answer
 * @returns {boolean}
 */
export function isFlashcardAnswerCorrect(selected, options, answer) {
  const resolved = resolveFlashcardAnswer(options, answer)
  if (!resolved) return false
  return String(selected).trim().toLowerCase() === resolved.trim().toLowerCase()
}
