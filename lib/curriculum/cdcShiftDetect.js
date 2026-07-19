/**
 * Auto-detect character-code shift for CDC PDFs that embed fonts without ToUnicode.
 *
 * Empirically confirmed shifts on Syllabus.zip: 0, +29, +34, +36 — never hardcode
 * a single value. Prefer detecting from a contentful middle-third page sample.
 * Mixed pages (readable header + encoded table) require encoded-line focus or
 * shift 0 wins incorrectly (seen on Biology).
 */

const ASCII_READABLE = new Set(
  Array.from("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,;:()-'\n\t")
)

const SYLLABUS_KEYWORDS = [
  'TOPIC',
  'SUB-TOPIC',
  'SUBTOPIC',
  'SPECIFIC COMPETENCE',
  'LEARNING ACTIVIT',
  'EXPECTED STANDARD',
  'FORM 1',
  'FORM 2',
  'FORM 3',
  'FORM 4',
]

/**
 * @param {string} text
 * @param {number} shift
 * @returns {string}
 */
export function shiftDecode(text, shift) {
  const s = String(text || '')
  if (!shift || !s) return s
  let out = ''
  for (const ch of s) {
    const next = ch.codePointAt(0) + shift
    out += next >= 0 && next <= 0x10ffff ? String.fromCodePoint(next) : ch
  }
  return out
}

/** TOC dotted leaders inflate wrong-shift scores. */
export function stripTocLeaders(text) {
  return String(text || '').replace(/[.\u00b7]{3,}/g, ' ')
}

/**
 * @param {string} text
 * @returns {number}
 */
export function scoreEnglish(text) {
  const cleaned = stripTocLeaders(text)
  if (!cleaned.length) return 0
  let good = 0
  for (const ch of cleaned) {
    if (ASCII_READABLE.has(ch)) good++
  }
  return good / cleaned.length
}

function scoreKeywords(text) {
  const upper = String(text || '').toUpperCase()
  let hits = 0
  for (const k of SYLLABUS_KEYWORDS) {
    if (upper.includes(k)) hits++
  }
  return hits / SYLLABUS_KEYWORDS.length
}

/**
 * Prefer lines that look font-encoded (control chars / low ASCII ratio).
 * @param {string} sampleText
 * @returns {string}
 */
export function encodedFocus(sampleText) {
  const lines = String(sampleText || '').split(/\r?\n/)
  const encoded = []
  for (const ln of lines) {
    if (ln.trim().length < 8) continue
    let hasCtrl = false
    let readable = 0
    for (const ch of ln) {
      const c = ch.codePointAt(0)
      if (c < 32 && ch !== '\t') hasCtrl = true
      if (ASCII_READABLE.has(ch)) readable++
    }
    const ratio = readable / Math.max(1, ln.length)
    if (hasCtrl || ratio < 0.55) encoded.push(ln)
  }
  const focus = encoded.join('\n')
  return focus.length > 80 ? focus : String(sampleText || '')
}

/**
 * Try shifts -40..+40; maximize plain-ASCII readability (+ keyword bonus).
 * @param {string} sampleText
 * @returns {{ shift: number, confidence: number }}
 */
export function detectShift(sampleText) {
  const focus = encodedFocus(sampleText)
  let bestShift = 0
  let bestScore = -1
  for (let shift = -40; shift <= 40; shift++) {
    const decoded = shiftDecode(focus, shift)
    const score = scoreEnglish(decoded) + 0.2 * scoreKeywords(decoded)
    if (score > bestScore) {
      bestShift = shift
      bestScore = score
    }
  }
  return {
    shift: bestShift,
    confidence: scoreEnglish(shiftDecode(focus, bestShift)),
  }
}

/**
 * Pick a middle-page sample from joined page texts or a single blob.
 * @param {string | Array<{ page?: number, text?: string }>} pagesOrText
 * @returns {string}
 */
export function middlePageSample(pagesOrText) {
  if (Array.isArray(pagesOrText) && pagesOrText.length) {
    const start = Math.floor(pagesOrText.length / 3)
    const end = Math.max(start + 1, Math.floor((2 * pagesOrText.length) / 3))
    let best = pagesOrText[Math.floor(pagesOrText.length / 2)]
    let bestWeight = -1
    for (let i = start; i < end; i++) {
      const t = String(pagesOrText[i]?.text || '')
      const cleaned = stripTocLeaders(t)
      const weight = [...cleaned].filter((c) => /[A-Za-z0-9]/.test(c)).length
      if (weight > bestWeight) {
        bestWeight = weight
        best = pagesOrText[i]
      }
    }
    return String(best?.text || '')
  }
  const full = String(pagesOrText || '')
  if (!full) return ''
  const start = Math.floor(full.length / 3)
  const end = Math.min(full.length, start + Math.max(2000, Math.floor(full.length / 3)))
  return full.slice(start, end)
}

/**
 * Decode text with an auto-detected or explicit shift.
 * @param {string} text
 * @param {{ shift?: number | null, sample?: string }} [options]
 * @returns {{ text: string, shift: number, confidence: number }}
 */
export function decodeWithDetectedShift(text, options = {}) {
  const sample = options.sample != null ? options.sample : middlePageSample(text)
  const detected =
    options.shift != null && Number.isFinite(options.shift)
      ? {
          shift: Number(options.shift),
          confidence: scoreEnglish(shiftDecode(sample || text, Number(options.shift))),
        }
      : detectShift(sample || text)
  const decoded = shiftDecode(text, detected.shift)
  return { text: decoded, shift: detected.shift, confidence: detected.confidence }
}
