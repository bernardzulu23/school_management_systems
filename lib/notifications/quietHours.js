import {
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
  DEFAULT_TIMEZONE,
} from '@/lib/notifications/constants'

function parseHm(value, fallbackHour, fallbackMinute) {
  const raw = String(value || '').trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return { hour: fallbackHour, minute: fallbackMinute }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

/** Minutes since midnight in the given IANA timezone */
export function getLocalMinutes(date, timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function isQuietHours(
  date = new Date(),
  {
    quietHoursStart = DEFAULT_QUIET_START,
    quietHoursEnd = DEFAULT_QUIET_END,
    timezone = DEFAULT_TIMEZONE,
  } = {}
) {
  const start = parseHm(quietHoursStart, 15, 0)
  const end = parseHm(quietHoursEnd, 6, 45)
  const startMins = start.hour * 60 + start.minute
  const endMins = end.hour * 60 + end.minute
  const nowMins = getLocalMinutes(date, timezone)

  if (startMins === endMins) return false
  if (startMins < endMins) {
    return nowMins >= startMins && nowMins < endMins
  }
  // Overnight window (e.g. 15:00 → 06:45)
  return nowMins >= startMins || nowMins < endMins
}

/**
 * Next dispatch instant at quiet-hours end (e.g. 06:45 local) if currently in quiet hours.
 * Returns `date` unchanged when not in quiet hours.
 */
export function resolveDispatchTime(
  date = new Date(),
  prefs = {
    quietHoursStart: DEFAULT_QUIET_START,
    quietHoursEnd: DEFAULT_QUIET_END,
    timezone: DEFAULT_TIMEZONE,
  }
) {
  if (!isQuietHours(date, prefs)) return date

  const end = parseHm(prefs.quietHoursEnd, 6, 45)
  const tz = prefs.timezone || DEFAULT_TIMEZONE
  const nowMins = getLocalMinutes(date, tz)
  const endMins = end.hour * 60 + end.minute

  let daysOffset = 0
  if (nowMins >= endMins) {
    daysOffset = 1
  }

  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

  const [year, month, day] = ymd.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1, day + daysOffset, end.hour, end.minute, 0, 0))

  // Approximate offset: compare formatted local hour to UTC
  const localAtTarget = getLocalMinutes(target, tz)
  const drift = endMins - localAtTarget
  target.setUTCMinutes(target.getUTCMinutes() + drift)

  return target
}
