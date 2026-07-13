/** Teacher colour maps for class-view timetables — persisted colours only. */

import {
  MISSING_TEACHER_COLOR,
  teacherColorFromStore,
  normalizeHex,
} from '@/lib/timetable/uniqueTeacherColors'

/** @deprecated — short palettes cause collisions; use TeacherColor DB rows. */
export const TEACHER_COLOR_PALETTE = [] as const

export function generateTeacherColors(teacherIds: string[]): Map<string, string> {
  const unique = [...new Set(teacherIds.map(String).filter(Boolean))]
  const colorMap = new Map<string, string>()
  unique.forEach((id) => colorMap.set(id, MISSING_TEACHER_COLOR))
  return colorMap
}

export function colorForTeacher(
  teacherId: string,
  colorMap: Map<string, string>,
  fallback = MISSING_TEACHER_COLOR
): string {
  return normalizeHex(colorMap.get(String(teacherId))) || fallback
}

/** Prefer stored DB/store hex; never invent a cycling palette. */
export function mergeTeacherColorMaps(
  teacherIds: string[],
  stored?: Record<string, { colorHex?: string } | string> | null
): Map<string, string> {
  const map = new Map<string, string>()
  for (const id of teacherIds) {
    map.set(String(id), teacherColorFromStore(id, stored))
  }
  return map
}
