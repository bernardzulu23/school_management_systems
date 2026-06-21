/** Teacher colour palette for class-view timetables (distinct fills per teacher). */

export const TEACHER_COLOR_PALETTE = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
  '#F8B88B',
  '#A8E6CF',
  '#FF8B94',
  '#6BCB77',
  '#4D96FF',
  '#FFD93D',
  '#6A4C93',
] as const

export function generateTeacherColors(teacherIds: string[]): Map<string, string> {
  const unique = [...new Set(teacherIds.map(String).filter(Boolean))].sort()
  const colorMap = new Map<string, string>()
  unique.forEach((id, idx) => {
    colorMap.set(id, TEACHER_COLOR_PALETTE[idx % TEACHER_COLOR_PALETTE.length])
  })
  return colorMap
}

export function colorForTeacher(
  teacherId: string,
  colorMap: Map<string, string>,
  fallback = '#cccccc'
): string {
  return colorMap.get(String(teacherId)) || fallback
}

/** Merge DB/store hex colours over generated defaults. */
export function mergeTeacherColorMaps(
  teacherIds: string[],
  stored?: Record<string, { colorHex?: string } | string>
): Map<string, string> {
  const map = generateTeacherColors(teacherIds)
  if (!stored) return map
  for (const id of teacherIds) {
    const raw = stored[id]
    const hex = typeof raw === 'string' ? raw : raw?.colorHex
    if (hex && /^#?[0-9a-fA-F]{6}$/.test(hex.replace('#', ''))) {
      map.set(String(id), hex.startsWith('#') ? hex : `#${hex}`)
    }
  }
  return map
}
