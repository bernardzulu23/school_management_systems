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

export function generateCardColor(
  subjectId: string | undefined | null,
  teacherId: string | undefined | null
): CardColor {
  const s = String(subjectId || '') + String(teacherId || '')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** @deprecated Use generateCardColor(subjectId, teacherId) */
export function pastelBgForSubject(subjectId: unknown): string {
  return generateCardColor(String(subjectId || ''), '').bg
}
