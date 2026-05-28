/**
 * Teacher labels for timetable cards (aSc-style initials on cells).
 */

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

/** Distinct hex colour per index (even spacing on hue wheel). */
export function distinctTeacherHex(index: number, total: number): string {
  const n = Math.max(1, total)
  const i = ((index % n) + n) % n
  const hue = Math.round((i * 360) / n) % 360
  return hslToHex(hue, 68, 46)
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
