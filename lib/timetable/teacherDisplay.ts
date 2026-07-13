/**
 * Teacher labels for timetable cards (aSc-style initials on cells).
 */

import { colorAtStep, GOLDEN_ANGLE_DEG } from '@/lib/timetable/uniqueTeacherColors'

/** e.g. "Mary Banda" → "MB", "Chanda" → "CH" */
export function teacherInitials(fullName: string | null | undefined): string {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) {
    const w = parts[0].replace(/[^a-zA-Z]/g, '')
    return (w.slice(0, 2) || '?').toUpperCase()
  }
  const first = parts[0].replace(/[^a-zA-Z]/g, '')[0] || ''
  const last = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '')[0] || ''
  return `${first}${last}`.toUpperCase() || '?'
}

/**
 * @param mode `initials` for grid cells; `full` for modals and print legends
 */
export function teacherDisplayName(
  fullName: string | null | undefined,
  mode: 'initials' | 'full' = 'initials'
): string {
  const name = String(fullName || '').trim() || 'Teacher'
  return mode === 'full' ? name : teacherInitials(name)
}

/** Distinct hex via golden-angle (prefer persisted TeacherColor; this is offline fallback). */
export function distinctTeacherHex(index: number, _total?: number): string {
  return colorAtStep(-GOLDEN_ANGLE_DEG, Math.max(0, index), Math.max(0, index)).colorHex
}
