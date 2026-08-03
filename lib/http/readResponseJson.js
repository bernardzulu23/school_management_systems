/**
 * Safely parse a fetch Response body as JSON.
 * Empty bodies and invalid JSON return `fallback` instead of throwing
 * ("Unexpected end of JSON input").
 *
 * @param {Response} res
 * @param {unknown} [fallback={}]
 */
export async function readResponseJson(res, fallback = {}) {
  try {
    const text = await res.text()
    if (!text || !String(text).trim()) return fallback
    return JSON.parse(text)
  } catch {
    return fallback
  }
}
