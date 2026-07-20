export function normalizeForSimilarity(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeForSimilarity(value: string, minTokenLength = 3): Set<string> {
  return new Set(
    normalizeForSimilarity(value)
      .split(' ')
      .filter((token) => token.length >= minTokenLength)
  )
}

// Shared token-overlap scoring pattern reused by non-LLM matchers.
export function similarity(a: string, b: string, minTokenLength = 3): number {
  const ta = tokenizeForSimilarity(a, minTokenLength)
  const tb = tokenizeForSimilarity(b, minTokenLength)
  if (!ta.size || !tb.size) return 0

  let intersection = 0
  for (const token of ta) {
    if (tb.has(token)) intersection += 1
  }

  return intersection / Math.max(ta.size, tb.size)
}
