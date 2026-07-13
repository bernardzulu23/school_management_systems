/** Client-safe teacher colour helpers — resolve persisted colours only (no inventing palettes). */

import {
  MISSING_TEACHER_COLOR,
  teacherColorFromStore,
  normalizeHex,
} from '@/lib/timetable/uniqueTeacherColors'

/** @deprecated Kept for import stability — do not cycle a shared palette. */
export const ASC_PALETTE = []

/**
 * Build a map from an optional persisted Record/Map only.
 * Does NOT invent colliding colours from a short palette.
 */
export function buildTeacherColorMap(teacherIds, persisted) {
  const map = new Map()
  for (const id of [...new Set((teacherIds || []).map(String).filter(Boolean))]) {
    const hex = teacherColorFromStore(id, persisted)
    map.set(id, hex)
  }
  return map
}

export function teacherCardStyle(hexColor) {
  const hex = normalizeHex(hexColor) || MISSING_TEACHER_COLOR
  return {
    backgroundColor: `${hex}22`,
    borderLeft: `3px solid ${hex}`,
    borderColor: hex,
  }
}
