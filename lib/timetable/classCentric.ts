/**
 * Zambian secondary timetables are grade-centric (Form 1A, Grade 10B, etc.).
 * Physical class/room allocation is not part of scheduling.
 */

export const TIMETABLE_CLASS_CENTRIC = true

export const ROOM_RELATED_CONFLICT_TYPES = new Set([
  'RoomDoubleBooked',
  'RoomUnavailable',
  'CapacityExceeded',
])

export function isRoomRelatedConflict(conflict: { type: string }) {
  return ROOM_RELATED_CONFLICT_TYPES.has(conflict.type)
}

export function filterClassCentricConflicts<T extends { type: string }>(conflicts: T[]): T[] {
  if (!TIMETABLE_CLASS_CENTRIC) return conflicts
  return conflicts.filter((c) => !isRoomRelatedConflict(c))
}
