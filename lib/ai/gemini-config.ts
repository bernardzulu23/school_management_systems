/** Shared Gemini model + endpoint helpers (Google AI Studio). */

export function getGeminiModel(): string {
  return String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim()
}

/** Models to try when the primary returns 404 / not supported. */
export function geminiModelCandidates(): string[] {
  const primary = String(process.env.GEMINI_MODEL || '').trim()
  const defaults = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-lite']
  return [...new Set([primary, ...defaults].filter(Boolean))]
}

export function geminiGenerateContentUrl(model: string): string {
  const m = String(model || getGeminiModel()).trim()
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`
}
