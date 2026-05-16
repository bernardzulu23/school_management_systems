/** @typedef {{ start: string, end: string, label?: string, isLunch?: boolean }} BreakSlot */

export const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export const DEFAULT_TIMETABLE_CONFIG = {
  startTime: '07:30',
  endTime: '15:30',
  singleDuration: 40,
  workingDays: DEFAULT_WORKING_DAYS,
  breakSlots: [
    { start: '10:10', end: '10:30', label: 'Break' },
    { start: '12:00', end: '12:40', label: 'Lunch', isLunch: true },
  ],
}

export function timeToMin(t) {
  const [h, m] = String(t || '0:0')
    .split(':')
    .map(Number)
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

export function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function normalizeWorkingDays(workingDays) {
  if (!Array.isArray(workingDays) || workingDays.length === 0) {
    return [...DEFAULT_WORKING_DAYS]
  }
  const out = workingDays
    .map((d) => {
      const s = String(d || '').trim()
      if (!s) return ''
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    })
    .filter(Boolean)
  return out.length ? out : [...DEFAULT_WORKING_DAYS]
}

export function normalizeDayKey(day) {
  return String(day || '')
    .trim()
    .toLowerCase()
}

export function parseBreakSlots(breakSlots) {
  if (Array.isArray(breakSlots)) return breakSlots
  try {
    const parsed = JSON.parse(String(breakSlots || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Build UI time-slot grid from TimetableConfig (matches server generate logic).
 */
export function buildTimeSlotsFromConfig(config) {
  if (!config) return []

  const startMin = timeToMin(config.startTime || DEFAULT_TIMETABLE_CONFIG.startTime)
  const endMin = timeToMin(config.endTime || DEFAULT_TIMETABLE_CONFIG.endTime)
  const singleMin = Number(config.singleDuration || DEFAULT_TIMETABLE_CONFIG.singleDuration)
  const breakSlots = parseBreakSlots(config.breakSlots)
  const workingDays = normalizeWorkingDays(config.workingDays)

  const breaks = breakSlots.map((b) => ({
    start: timeToMin(b.start),
    end: timeToMin(b.end),
    label: b.label || 'Break',
    isLunch: Boolean(b.isLunch),
  }))

  const out = []
  for (const day of workingDays) {
    const dayKey = normalizeDayKey(day)
    let cursor = startMin
    let periodNum = 1

    while (cursor < endMin) {
      const inBreak = breaks.find((b) => cursor >= b.start && cursor < b.end)
      if (inBreak) {
        out.push({
          id: `${dayKey}-break-${cursor}`,
          dayOfWeek: dayKey,
          startTime: minToTime(inBreak.start),
          endTime: minToTime(inBreak.end),
          period: 0,
          isBreak: true,
          label: inBreak.label,
        })
        cursor = inBreak.end
        continue
      }

      const nextBreak = breaks.find((b) => b.start > cursor)
      const ceilMin = nextBreak ? Math.min(endMin, nextBreak.start) : endMin

      if (cursor + singleMin <= ceilMin) {
        out.push({
          id: `${dayKey}-${periodNum}`,
          dayOfWeek: dayKey,
          startTime: minToTime(cursor),
          endTime: minToTime(cursor + singleMin),
          period: periodNum,
          isBreak: false,
          label: `Period ${periodNum}`,
        })
        cursor += singleMin
        periodNum += 1
      } else {
        cursor = nextBreak ? nextBreak.start : endMin
      }
    }
  }

  return out
}

/**
 * When config slots do not match generated entry times, derive grid rows from entries.
 */
export function buildTimeSlotsFromEntries(entries) {
  const map = new Map()
  for (const e of entries || []) {
    if (!e?.startTime || !e?.endTime) continue
    const period = Number(e.periodNumber || e.period || 0)
    const k = `${period}|${e.startTime}|${e.endTime}`
    if (!map.has(k)) {
      map.set(k, {
        id: `entry-${k}`,
        dayOfWeek: 'monday',
        startTime: e.startTime,
        endTime: e.endTime,
        period: period || map.size + 1,
        isBreak: false,
        label: period ? `Period ${period}` : 'Lesson',
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.period - b.period)
}

export function mergeTimeSlotGrids(configSlots, entrySlots) {
  if (configSlots?.length) return configSlots
  return entrySlots || []
}

/** Normalize API/DB config for forms and slot building. */
export function normalizeTimetableConfig(raw) {
  if (!raw)
    return { ...DEFAULT_TIMETABLE_CONFIG, breakSlots: [...DEFAULT_TIMETABLE_CONFIG.breakSlots] }
  return {
    startTime: String(raw.startTime || DEFAULT_TIMETABLE_CONFIG.startTime).slice(0, 5),
    endTime: String(raw.endTime || DEFAULT_TIMETABLE_CONFIG.endTime).slice(0, 5),
    singleDuration: Number(raw.singleDuration || DEFAULT_TIMETABLE_CONFIG.singleDuration),
    workingDays: normalizeWorkingDays(raw.workingDays),
    breakSlots: parseBreakSlots(raw.breakSlots).map((b) => ({
      label: String(b.label || 'Break'),
      start: String(b.start || '10:00').slice(0, 5),
      end: String(b.end || '10:30').slice(0, 5),
      isLunch: Boolean(b.isLunch),
    })),
    term: raw.term,
    academicYear: raw.academicYear,
  }
}

export function validateTimetableConfig(config) {
  const c = normalizeTimetableConfig(config)
  const errors = []
  const start = timeToMin(c.startTime)
  const end = timeToMin(c.endTime)

  if (end <= start) {
    errors.push('School end time must be after start time.')
  }
  if (c.singleDuration < 20 || c.singleDuration > 120) {
    errors.push('Period duration must be between 20 and 120 minutes.')
  }
  if (!c.workingDays.length) {
    errors.push('Select at least one working day.')
  }

  for (const b of c.breakSlots) {
    const bs = timeToMin(b.start)
    const be = timeToMin(b.end)
    if (be <= bs) {
      errors.push(`Break "${b.label}" must end after it starts.`)
    }
    if (bs < start || be > end) {
      errors.push(`Break "${b.label}" must fall within school hours.`)
    }
  }

  return { valid: errors.length === 0, errors, config: c }
}

/** Count teaching periods on one representative day (excludes breaks). */
export function countPeriodsPerDay(config) {
  const slots = buildTimeSlotsFromConfig(normalizeTimetableConfig(config))
  const monday = slots.filter((s) => s.dayOfWeek === 'monday' && !s.isBreak)
  return monday.length
}

export async function ensureTimetableConfig(prisma, schoolId) {
  const existing = await prisma.timetableConfig.findUnique({ where: { schoolId } })
  if (existing) {
    const workingDays = normalizeWorkingDays(existing.workingDays)
    if (
      JSON.stringify(existing.workingDays) !== JSON.stringify(workingDays) &&
      (!Array.isArray(existing.workingDays) || existing.workingDays.length === 0)
    ) {
      return prisma.timetableConfig.update({
        where: { schoolId },
        data: { workingDays },
      })
    }
    return existing
  }

  return prisma.timetableConfig.create({
    data: {
      schoolId,
      ...DEFAULT_TIMETABLE_CONFIG,
      breakSlots: DEFAULT_TIMETABLE_CONFIG.breakSlots,
    },
  })
}
