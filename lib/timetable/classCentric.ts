/**
 * Zambian secondary timetables are grade-centric (Form 1A, Grade 10B, etc.).
 * Home-room (form) allocation is not required — learners stay with their class.
 * Specialist venues (Science/IT/H/E labs, PE) may still set `classroomId` on entries;
 * `ROOM_DOUBLE_BOOKED` / EXCLUDE then prevent two classes sharing that venue at once.
 * Legacy PascalCase room types below remain filtered from the older CollisionDetector path.
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
