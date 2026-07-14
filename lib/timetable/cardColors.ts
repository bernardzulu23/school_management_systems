/** aSc/FET-style card colours — prefer persisted TeacherColor.colorHex only. */

import { MISSING_TEACHER_COLOR, normalizeHex } from '@/lib/timetable/uniqueTeacherColors'

export type CardColor = { bg: string; border: string }

/** Pastels for non-timetable UI chips only (not teacher identity). */
const SUBJECT_PASTEL: CardColor[] = [
  { bg: '#dbeafe', border: '#93c5fd' },
  { bg: '#dcfce7', border: '#86efac' },
  { bg: '#ffedd5', border: '#fdba74' },
  { bg: '#fae8ff', border: '#e879f9' },
  { bg: '#fef9c3', border: '#fde047' },
  { bg: '#ccfbf1', border: '#5eead4' },
  { bg: '#ffe4e6', border: '#fda4af' },
  { bg: '#e0e7ff', border: '#a5b4fc' },
]

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** @deprecated Subject-hashed solids cause collisions — prefer TeacherColor for grids. */
export function solidSubjectFill(_subjectId: string | undefined | null): {
  fill: string
  text: string
} {
  const fill = MISSING_TEACHER_COLOR
  return { fill, text: relativeLuminance(fill) > 0.4 ? '#1e1e1e' : '#ffffff' }
}

/** Soft pastel for subject chips outside timetable grids (not teacher SoT). */
export function generateCardColor(
  subjectId: string | undefined | null,
  _teacherId?: string | null
): CardColor {
  const s = String(subjectId || 'subject')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return SUBJECT_PASTEL[hash % SUBJECT_PASTEL.length]
}

/** Convert stored hex (aSc-style) to card bg/border pair. */
export function hexToCardColor(hex: string): CardColor {
  const h = normalizeHex(hex) || MISSING_TEACHER_COLOR
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.22)`,
    border: h,
  }
}

/**
 * Resolve timetable cell colour from persisted teacher hex only.
 * Never invents a cycling palette — missing DB colour → neutral slate.
 */
export function resolveCardColor(
  _subjectId: string | undefined | null,
  _teacherId: string | undefined | null,
  dbHex?: string | null,
  _mode: 'subject' | 'teacher' = 'teacher'
): CardColor {
  return hexToCardColor(dbHex || MISSING_TEACHER_COLOR)
}

/** Soft pastel for subject chips outside timetable grids. */
export function pastelBgForSubject(subjectId: unknown): string {
  return generateCardColor(String(subjectId || ''), '').bg
}
