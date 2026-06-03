/**
 * Build a Date from a calendar day + optional time string (e.g. "14:30", "2:30 PM").
 * @param {Date | string} dateInput
 * @param {string | null | undefined} timeStr
 */
export function activityStartsAt(dateInput, timeStr) {
  const base = new Date(dateInput)
  if (Number.isNaN(base.getTime())) return null

  const raw = String(timeStr || '').trim()
  if (!raw) {
    const d = new Date(base)
    d.setHours(9, 0, 0, 0)
    return d
  }

  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) {
    const d = new Date(base)
    d.setHours(9, 0, 0, 0)
    return d
  }

  let hours = Number(m[1])
  const minutes = Number(m[2] || 0)
  const ampm = (m[3] || '').toLowerCase()
  if (ampm === 'pm' && hours < 12) hours += 12
  if (ampm === 'am' && hours === 12) hours = 0

  const d = new Date(base)
  d.setHours(hours, minutes, 0, 0)
  return d
}

/**
 * @param {Date} startsAt
 */
export function countdownMeta(startsAt) {
  const msUntil = startsAt.getTime() - Date.now()
  const isPast = msUntil <= 0
  const abs = Math.abs(msUntil)
  const totalMinutes = Math.floor(abs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const seconds = Math.floor((abs % 60000) / 1000)

  let label = ''
  if (isPast) {
    label = 'Started'
  } else if (days > 0) {
    label = `${days}d ${hours}h`
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    label = `${minutes}m ${seconds}s`
  } else {
    label = `${seconds}s`
  }

  const urgency = isPast
    ? 'past'
    : msUntil <= 60 * 60 * 1000
      ? 'urgent'
      : msUntil <= 24 * 60 * 60 * 1000
        ? 'soon'
        : 'normal'

  return {
    msUntil,
    isPast,
    days,
    hours,
    minutes,
    seconds,
    label,
    urgency,
    startsAt: startsAt.toISOString(),
  }
}

export function formatCountdownLive(meta) {
  if (meta.isPast) return 'In progress / started'
  if (meta.days > 0) return `${meta.days} day${meta.days === 1 ? '' : 's'}, ${meta.hours}h`
  if (meta.hours > 0) return `${meta.hours}h ${meta.minutes}m`
  if (meta.minutes > 0) return `${meta.minutes}m ${meta.seconds}s`
  return `${meta.seconds}s`
}
