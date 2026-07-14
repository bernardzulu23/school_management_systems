/**
 * Half-open [start, end) minute overlap — matches Postgres
 * `timetable_slot_int4range` + EXCLUDE USING gist (... WITH &&).
 * Adjacent slots (e.g. 07:30–08:50 and 08:50–09:30) do NOT overlap.
 */

export function parseTimeToMinutes(time?: string | null): number | null {
  if (!time || typeof time !== 'string') return null
  const [h, m] = time.split(':').map((v) => Number.parseInt(v, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/** True when [startA, endA) overlaps [startB, endB) on a shared calendar day. */
export function halfOpenTimeRangesOverlap(
  dayA: string | undefined | null,
  startA: string | undefined | null,
  endA: string | undefined | null,
  dayB: string | undefined | null,
  startB: string | undefined | null,
  endB: string | undefined | null
): boolean {
  if (!dayA || !dayB) return false
  if (String(dayA).toLowerCase() !== String(dayB).toLowerCase()) return false
  const a0 = parseTimeToMinutes(startA)
  const a1 = parseTimeToMinutes(endA)
  const b0 = parseTimeToMinutes(startB)
  const b1 = parseTimeToMinutes(endB)
  if (a0 == null || a1 == null || b0 == null || b1 == null) return false
  if (a1 <= a0 || b1 <= b0) return false
  return a0 < b1 && b0 < a1
}

export type TimedSlotLike = {
  dayOfWeek?: string | null
  startTime?: string | null
  endTime?: string | null
  isBreak?: boolean
  season?: string | null
}

/**
 * Application-level twin of the class/teacher/room EXCLUDE predicates:
 * same day + overlapping half-open time ranges (optional season gate).
 */
export function timedSlotsOverlap(
  a: TimedSlotLike,
  b: TimedSlotLike,
  options: { respectSeason?: boolean } = {}
): boolean {
  if (a.isBreak || b.isBreak) return false
  if (options.respectSeason !== false && a.season && b.season && a.season !== b.season) {
    return false
  }
  return halfOpenTimeRangesOverlap(
    a.dayOfWeek,
    a.startTime,
    a.endTime,
    b.dayOfWeek,
    b.startTime,
    b.endTime
  )
}

export type RoomSlotLike = TimedSlotLike & {
  classroomId?: string | null
  roomId?: string | null
}

/**
 * Twin of `TimetableAllocationEntry_no_room_overlap`:
 * both rows must have the same non-null classroomId/roomId + timedSlotsOverlap.
 */
export function roomSlotsOverlap(
  a: RoomSlotLike,
  b: RoomSlotLike,
  options: { respectSeason?: boolean } = {}
): boolean {
  const roomA = String(a.classroomId || a.roomId || '').trim()
  const roomB = String(b.classroomId || b.roomId || '').trim()
  if (!roomA || !roomB || roomA !== roomB) return false
  return timedSlotsOverlap(a, b, options)
}

export function formatTimeWindow(start?: string | null, end?: string | null): string {
  const s = String(start || '').slice(0, 5)
  const e = String(end || '').slice(0, 5)
  if (s && e) return `${s}–${e}`
  return s || e || 'unknown time'
}

/**
 * CLASS_DOUBLE_BOOKED copy that cites concrete windows (works for same- or
 * different-subject overlaps; never relies on deduped subject names alone).
 */
export function buildClassDoubleBookedMessage(input: {
  className?: string | null
  dayOfWeek?: string | null
  entries: Array<{
    subjectName?: string | null
    startTime?: string | null
    endTime?: string | null
  }>
}): string {
  const className = input.className || 'Class'
  const day = String(input.dayOfWeek || 'the same day').toLowerCase()
  const windows = input.entries.map((e) => formatTimeWindow(e.startTime, e.endTime)).filter(Boolean)
  const uniqueWindows = [...new Set(windows)]
  const subjects = input.entries.map((e) => e.subjectName).filter(Boolean) as string[]
  const uniqueSubjects = [...new Set(subjects)]
  const windowLabel =
    uniqueWindows.length >= 2
      ? uniqueWindows.join(' and ')
      : uniqueWindows[0] || 'overlapping times'

  if (uniqueSubjects.length <= 1) {
    const subject = uniqueSubjects[0] || 'the same subject'
    return `${className} has two ${subject} periods scheduled at overlapping times: ${windowLabel} (${day})`
  }

  return `${className} is scheduled for ${uniqueSubjects.join(' and ')} at overlapping times: ${windowLabel} (${day})`
}

/**
 * ROOM_DOUBLE_BOOKED copy citing concrete windows and classes sharing the venue.
 */
export function buildRoomDoubleBookedMessage(input: {
  roomName?: string | null
  dayOfWeek?: string | null
  entries: Array<{
    className?: string | null
    subjectName?: string | null
    startTime?: string | null
    endTime?: string | null
  }>
}): string {
  const roomName = input.roomName || 'Room'
  const day = String(input.dayOfWeek || 'the same day').toLowerCase()
  const windows = input.entries.map((e) => formatTimeWindow(e.startTime, e.endTime)).filter(Boolean)
  const uniqueWindows = [...new Set(windows)]
  const classes = input.entries.map((e) => e.className).filter(Boolean) as string[]
  const uniqueClasses = [...new Set(classes)]
  const windowLabel =
    uniqueWindows.length >= 2
      ? uniqueWindows.join(' and ')
      : uniqueWindows[0] || 'overlapping times'

  if (uniqueClasses.length >= 2) {
    return `${roomName} is double-booked by ${uniqueClasses.join(' and ')} at overlapping times: ${windowLabel} (${day})`
  }

  const classLabel = uniqueClasses[0] || 'two classes'
  return `${roomName} is double-booked (${classLabel}) at overlapping times: ${windowLabel} (${day})`
}
