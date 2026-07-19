/**
 * Decode Zambia CDC syllabus PDFs that embed fonts without a ToUnicode map.
 *
 * Prefer auto-detected per-file shifts via decodeWithDetectedShift /
 * detectShift (empirically 0, +29, +34, +36). The fixed +29 helpers remain
 * for unit tests and legacy call sites that already know the offset.
 */

import { decodeWithDetectedShift, shiftDecode } from '@/lib/curriculum/cdcShiftDetect'

const DEFAULT_SHIFT = 29

/**
 * @param {string} line
 * @param {number} [shift=29]
 * @returns {string}
 */
export function decodeCdcLine(line, shift = DEFAULT_SHIFT) {
  const s = String(line || '')
  if (!/[\x01-\x1f]/.test(s)) return s

  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0)
    // Encoded space is typically U+0003 (+29 → ' '). Never shift a real ASCII
    // space — mixed lines occasionally keep readable whitespace.
    if (c >= 1 && c <= 97 && c !== 32) {
      const d = c + shift
      if (d >= 32 && d <= 126) {
        out += String.fromCharCode(d)
        continue
      }
    }
    out += ch
  }
  return out
}

/**
 * @param {string} text
 * @param {number} [shift=29]
 * @returns {string}
 */
export function decodeCdcText(text, shift = DEFAULT_SHIFT) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => decodeCdcLine(line, shift))
    .join('\n')
}

/**
 * Auto-detect shift from a middle-page sample, then decode the full text.
 * Use this for raw PDF extracts; skip when text was already shift-corrected
 * by ingest/01_extract_and_fix.py (confidence-correct, shift already applied).
 *
 * @param {string} text
 * @param {{ sample?: string, shift?: number | null, alreadyDecoded?: boolean }} [options]
 * @returns {{ text: string, shift: number, confidence: number }}
 */
export function decodeCdcTextAuto(text, options = {}) {
  if (options.alreadyDecoded) {
    return { text: String(text || ''), shift: 0, confidence: 1 }
  }
  if (options.shift != null && Number.isFinite(options.shift)) {
    const shift = Number(options.shift)
    return {
      text: shift === 0 ? String(text || '') : shiftDecode(String(text || ''), shift),
      shift,
      confidence: 1,
    }
  }
  return decodeWithDetectedShift(String(text || ''), { sample: options.sample })
}

/**
 * Strip TOC dotted leaders and leftover control bytes after decode.
 * @param {string} s
 * @returns {string}
 */
export function cleanCdcLine(s) {
  return String(s || '')
    .replace(/[.\u00b7]{3,}/g, ' ')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export { detectShift, shiftDecode, scoreEnglish } from '@/lib/curriculum/cdcShiftDetect'
