/**
 * Deterministic unique teacher colours (aSc-style).
 * Pure helpers — safe on client and server. Persistence lives in assignTeacherColor.js.
 */

export const GOLDEN_ANGLE_DEG = 137.50776405003785

/** Min circular hue distance (°) before two colours are treated as colliding. */
export const MIN_HUE_DELTA_DEG = 10

/** Min lightness difference (%) that can separate same-ish hues. */
export const MIN_LIGHTNESS_DELTA = 8

/** Saturation / lightness bands tuned for light grids + dark text readability. */
export const SATURATION_BANDS = [72, 58, 66, 50]
export const LIGHTNESS_BANDS = [36, 44, 52, 40, 48, 56, 32, 60]

export type Hsl = { h: number; s: number; l: number }

export function normalizeHex(hex: string | null | undefined): string | null {
  const raw = String(hex || '').trim()
  if (!raw) return null
  const withHash = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null
  return withHash.toUpperCase()
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.max(0, Math.min(100, s)) / 100
  const lig = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) {
    r = c
    g = x
  } else if (hue < 120) {
    r = x
    g = c
  } else if (hue < 180) {
    g = c
    b = x
  } else if (hue < 240) {
    g = x
    b = c
  } else if (hue < 300) {
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
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hexToHsl(hex: string): Hsl | null {
  const n = normalizeHex(hex)
  if (!n) return null
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function circularHueDelta(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return Math.min(d, 360 - d)
}

/** True when colours collide or are visually too close for aSc timetable cards. */
export function colorsTooClose(hexA: string, hexB: string): boolean {
  const a = normalizeHex(hexA)
  const b = normalizeHex(hexB)
  if (!a || !b) return false
  if (a === b) return true
  const ha = hexToHsl(a)
  const hb = hexToHsl(b)
  if (!ha || !hb) return a === b
  const hueDelta = circularHueDelta(ha.h, hb.h)
  const lightDelta = Math.abs(ha.l - hb.l)
  const satDelta = Math.abs(ha.s - hb.s)
  // Same-ish hue needs clear lightness separation
  if (hueDelta < MIN_HUE_DELTA_DEG && lightDelta < MIN_LIGHTNESS_DELTA) return true
  // Extremely close hues need even more separation
  if (hueDelta < 8 && lightDelta < MIN_LIGHTNESS_DELTA + 4) return true
  // Near-identical overall appearance
  if (hueDelta < 6 && lightDelta < 6 && satDelta < 10) return true
  return false
}

export function relativeLuminance(hex: string): number {
  const n = normalizeHex(hex)
  if (!n) return 0.5
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const r = lin(parseInt(n.slice(1, 3), 16) / 255)
  const g = lin(parseInt(n.slice(3, 5), 16) / 255)
  const b = lin(parseInt(n.slice(5, 7), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function textOnTeacherColor(hex: string): string {
  return relativeLuminance(hex) > 0.4 ? '#1e1e1e' : '#ffffff'
}

export function solidTeacherFill(hex: string | null | undefined): { fill: string; text: string } {
  const fill = normalizeHex(hex) || '#94A3B8'
  return { fill, text: textOnTeacherColor(fill) }
}

export type ColorCandidate = {
  colorHex: string
  hue: number
  saturation: number
  lightness: number
}

/**
 * Next colour after `lastHue`. `attempt` 0 = next golden step; 1 = skip one, etc.
 * `bandIndex` (typically current assigned count) varies lightness/saturation for scale.
 */
export function colorAtStep(lastHue: number, attempt = 0, bandIndex = 0): ColorCandidate {
  const hue = ((((Number(lastHue) || 0) + GOLDEN_ANGLE_DEG * (attempt + 1)) % 360) + 360) % 360
  const lightness = LIGHTNESS_BANDS[(bandIndex + attempt) % LIGHTNESS_BANDS.length]
  const saturation =
    SATURATION_BANDS[Math.floor((bandIndex + attempt) / 20) % SATURATION_BANDS.length]
  return {
    colorHex: hslToHex(hue, saturation, lightness),
    hue,
    saturation,
    lightness,
  }
}

/**
 * Pick the next unique colour for a school given existing hexes + last assigned hue.
 * Advances golden-angle and explores S/L bands so 40–60+ teachers stay separable.
 */
export function pickUniqueTeacherColor(opts: {
  lastAssignedHue: number
  existingHexes: string[]
  /** How many colours already assigned at school (drives lightness band). */
  assignedCount?: number
  maxAttempts?: number
}): ColorCandidate & { ok: boolean } {
  const existing = (opts.existingHexes || []).map(normalizeHex).filter(Boolean) as string[]
  const bandIndex = Math.max(0, Number(opts.assignedCount) || existing.length)
  const maxAttempts = Math.max(48, Number(opts.maxAttempts) || 720)
  const lastHue = Number.isFinite(opts.lastAssignedHue)
    ? Number(opts.lastAssignedHue)
    : -GOLDEN_ANGLE_DEG

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const hue = (((lastHue + GOLDEN_ANGLE_DEG * (attempt + 1)) % 360) + 360) % 360
    for (let bi = 0; bi < LIGHTNESS_BANDS.length; bi++) {
      for (let si = 0; si < SATURATION_BANDS.length; si++) {
        const lightness = LIGHTNESS_BANDS[(bandIndex + attempt + bi * 2) % LIGHTNESS_BANDS.length]
        const saturation =
          SATURATION_BANDS[(si + Math.floor((bandIndex + attempt) / 15)) % SATURATION_BANDS.length]
        const colorHex = hslToHex(hue, saturation, lightness)
        const tooClose = existing.some((hex) => colorsTooClose(hex, colorHex))
        if (!tooClose) {
          return { colorHex, hue, saturation, lightness, ok: true }
        }
      }
    }
  }

  const fallback = colorAtStep(lastHue, maxAttempts - 1, bandIndex)
  return { ...fallback, ok: false }
}

/** Neutral fallback when DB colour not yet loaded (never invent a colliding “temp” palette). */
export const MISSING_TEACHER_COLOR = '#94A3B8'

/**
 * Resolve colour from persisted map only — no per-view palette cycling.
 * `map` keys are User.id (assignment.teacherId).
 */
export function resolvePersistedTeacherHex(
  teacherUserId: string | null | undefined,
  map?: Map<string, string> | Record<string, { colorHex?: string } | string> | null
): string | null {
  const id = String(teacherUserId || '').trim()
  if (!id || !map) return null
  if (map instanceof Map) {
    return normalizeHex(map.get(id) || null)
  }
  const raw = map[id]
  const hex = typeof raw === 'string' ? raw : raw?.colorHex
  return normalizeHex(hex || null)
}

export function teacherColorFromStore(
  teacherUserId: string | null | undefined,
  map?: Map<string, string> | Record<string, { colorHex?: string } | string> | null
): string {
  return resolvePersistedTeacherHex(teacherUserId, map) || MISSING_TEACHER_COLOR
}
