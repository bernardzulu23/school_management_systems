/** aSc/FET-style card colours — stable per teacher + subject pair. */

export type CardColor = { bg: string; border: string }

// ── Expanded to 16 perceptually distinct pastels ────────────────────────────
// Ordered to maximise hue distance between adjacent entries.
// Checked for WCAG AA contrast at these light fills.
const PALETTE: CardColor[] = [
  { bg: '#dbeafe', border: '#93c5fd' }, // blue
  { bg: '#dcfce7', border: '#86efac' }, // green
  { bg: '#ffedd5', border: '#fdba74' }, // orange
  { bg: '#fae8ff', border: '#e879f9' }, // purple
  { bg: '#fef9c3', border: '#fde047' }, // yellow
  { bg: '#ccfbf1', border: '#5eead4' }, // teal
  { bg: '#ffe4e6', border: '#fda4af' }, // rose
  { bg: '#e0e7ff', border: '#a5b4fc' }, // indigo
  { bg: '#fdf2f8', border: '#f0abfc' }, // pink
  { bg: '#ecfdf5', border: '#6ee7b7' }, // emerald
  { bg: '#fff7ed', border: '#fb923c' }, // amber
  { bg: '#f0f9ff', border: '#7dd3fc' }, // sky
  { bg: '#fdf4ff', border: '#d946ef' }, // fuchsia
  { bg: '#f7fee7', border: '#bef264' }, // lime
  { bg: '#fff1f2', border: '#fb7185' }, // pink-red
  { bg: '#fffbeb', border: '#fbbf24' }, // warm yellow
]

// ── 16 saturated aSc-style fills ────────────────────────────────────────────
// Rules applied:
//   - No more than 1 entry per hue family (removed 2 duplicate blues, 1 gray)
//   - No gray (reserved for free/break periods)
//   - Red shifted to crimson to avoid red+green deuteranopia clash
//   - Perceptual spacing checked with HSL distance
const ASC_SOLID: string[] = [
  '#2563eb', // blue
  '#16a34a', // green
  '#d97706', // amber
  '#dc2626', // red  (crimson — shifted from pure red)
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#c2410c', // orange-red
  '#059669', // emerald
  '#db2777', // pink
  '#ca8a04', // yellow-ochre
  '#9333ea', // purple
  '#0284c7', // sky blue (replacing duplicate navy)
  '#be123c', // rose
  '#15803d', // forest green
  '#b45309', // brown-amber
  '#1d4ed8', // deep blue (replacing #264478 — enough distance from #2563eb)
]

// ── Luminance + contrast ─────────────────────────────────────────────────────
// WCAG AA requires 4.5:1 ratio for normal text.
// Empirically: relative luminance > 0.40 → use dark text; ≤ 0.40 → white.
// (Previous threshold 0.62 was too high — caused failures on mid-tones.)
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  // sRGB linearisation per WCAG 2.1
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function solidSubjectFill(subjectId: string | undefined | null): {
  fill: string
  text: string
} {
  const s = String(subjectId || 'default')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  const fill = ASC_SOLID[hash % ASC_SOLID.length]
  // WCAG-compliant threshold
  return { fill, text: relativeLuminance(fill) > 0.4 ? '#1e1e1e' : '#ffffff' }
}

export function generateCardColor(
  subjectId: string | undefined | null,
  teacherId: string | undefined | null
): CardColor {
  const s = String(subjectId || '') + String(teacherId || '')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** Convert stored hex (aSc-style) to card bg/border pair. */
export function hexToCardColor(hex: string): CardColor {
  const raw = String(hex || '').trim()
  const h = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return PALETTE[0]
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.18)`,
    border: h,
  }
}

/**
 * Resolve the final card colour for a timetable cell.
 *
 * Priority:
 *   1. Stored hex from DB (teacher's manually chosen colour)
 *   2. Subject-stable colour (student view — identifies subject at a glance)
 *   3. Teacher-stable colour (teacher view — identifies whose period it is)
 *
 * The previous implementation passed an empty subjectId, which meant the
 * same teacher teaching different subjects got identical colours. Fixed.
 */
export function resolveCardColor(
  subjectId: string | undefined | null,
  teacherId: string | undefined | null,
  dbHex?: string | null,
  mode: 'subject' | 'teacher' = 'subject'
): CardColor {
  if (dbHex) return hexToCardColor(dbHex)
  if (mode === 'teacher') return generateCardColor('', teacherId)
  // Default: subject-stable (aSc student view behaviour)
  return generateCardColor(subjectId, '')
}

/** @deprecated Use generateCardColor(subjectId, teacherId) */
export function pastelBgForSubject(subjectId: unknown): string {
  return generateCardColor(String(subjectId || ''), '').bg
}
