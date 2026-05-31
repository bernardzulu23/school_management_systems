/** aSc/FET-style card colors: stable per teacher + subject pair. */

export type CardColor = { bg: string; border: string }

const PALETTE: CardColor[] = [
  { bg: '#dbeafe', border: '#bfdbfe' },
  { bg: '#dcfce7', border: '#bbf7d0' },
  { bg: '#fef9c3', border: '#fef08a' },
  { bg: '#ffe4e6', border: '#fecdd3' },
  { bg: '#e0e7ff', border: '#c7d2fe' },
  { bg: '#fae8ff', border: '#f5d0fe' },
  { bg: '#ffedd5', border: '#fed7aa' },
]

/** Saturated fills for compact aSc-style wall cells (subject-stable). */
const ASC_SOLID: string[] = [
  '#5b9bd5',
  '#70ad47',
  '#ffc000',
  '#ed7d31',
  '#a5a5a5',
  '#4472c4',
  '#264478',
  '#9e480e',
  '#636363',
  '#997300',
  '#c00000',
  '#7030a0',
]

export function solidSubjectFill(subjectId: string | undefined | null): {
  fill: string
  text: string
} {
  const s = String(subjectId || 'default')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  const fill = ASC_SOLID[hash % ASC_SOLID.length]
  const r = parseInt(fill.slice(1, 3), 16)
  const g = parseInt(fill.slice(3, 5), 16)
  const b = parseInt(fill.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return { fill, text: lum > 0.62 ? '#1e1e1e' : '#ffffff' }
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
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) {
    return PALETTE[0]
  }
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.22)`,
    border: h,
  }
}

export function resolveCardColor(
  subjectId: string | undefined | null,
  teacherId: string | undefined | null,
  dbHex?: string | null
): CardColor {
  if (dbHex) return hexToCardColor(dbHex)
  // One colour per teacher (aSc-style), not per subject+teacher pair
  return generateCardColor('', teacherId)
}

/** @deprecated Use generateCardColor(subjectId, teacherId) */
export function pastelBgForSubject(subjectId: unknown): string {
  return generateCardColor(String(subjectId || ''), '').bg
}
