/**
 * Naive text chunker (~4 chars per token). Overlap preserves context across chunk boundaries.
 * @param {string} text
 * @param {number} [maxTokens]
 * @returns {string[]}
 */
export function chunkText(text, maxTokens = 500) {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (!normalized) return []

  const chunkSize = maxTokens * 4
  const overlap = 100 * 4
  const chunks = []
  let start = 0

  while (start < normalized.length) {
    const slice = normalized.slice(start, start + chunkSize).trim()
    if (slice) chunks.push(slice)
    if (start + chunkSize >= normalized.length) break
    start += chunkSize - overlap
  }

  return chunks
}
