/**
 * Deterministic unique teacher colours (aSc-style).
 * Pure helpers — safe on client and server. Persistence lives in assignTeacherColor.js.
 *
 * Uniqueness is judged for **chip-scale** UI (≈18–28px cells with 2-letter abbreviations),
 * not large labeled swatches — use CIEDE2000 perceptual distance.
 */

export const GOLDEN_ANGLE_DEG = 137.50776405003785

/**
 * Minimum CIEDE2000 ΔE between any two teacher colours at chip scale.
 * Visual-fail pairs from the live report sit at ΔE ≈ 2.7–13.4.
 * Gate at 14 rejects those; denser Lab packing targets a full secondary (~25–40).
 */
export const MIN_CIEDE2000 = 14

/** Extra hue-degree floor (backup); CIEDE is primary. */
export const MIN_HUE_DELTA_DEG = 10

/** Min lightness separation (%) when hues are within MIN_HUE_DELTA_DEG. */
export const MIN_LIGHTNESS_DELTA = 10

/**
 * Saturation / lightness bands for chip readability on light timetable grids.
 */
export const SATURATION_BANDS = [78, 62, 50, 70, 42]
export const LIGHTNESS_BANDS = [28, 36, 44, 52, 60, 32, 48, 56]

export type Hsl = { h: number; s: number; l: number }
export type Rgb = { r: number; g: number; b: number }
export type Lab = { L: number; a: number; b: number }

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

export function hexToRgb(hex: string): Rgb | null {
  const n = normalizeHex(hex)
  if (!n) return null
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  }
}

export function hexToHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
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

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** sRGB hex → CIE L*a*b* (D65). */
export function hexToLab(hex: string): Lab | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const R = srgbToLinear(rgb.r)
  const G = srgbToLinear(rgb.g)
  const B = srgbToLinear(rgb.b)
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047
  const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / 1.0
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116)
  const fx = f(X)
  const fy = f(Y)
  const fz = f(Z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

/**
 * CIEDE2000 colour difference (Sharma et al.).
 * @see https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
 */
export function ciede2000(hexA: string, hexB: string): number {
  const lab1 = hexToLab(hexA)
  const lab2 = hexToLab(hexB)
  if (!lab1 || !lab2) return Infinity

  const { L: L1, a: a1, b: b1 } = lab1
  const { L: L2, a: a2, b: b2 } = lab2

  const kL = 1
  const kC = 1
  const kH = 1

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cab = (C1 + C2) / 2
  const Cab7 = Cab ** 7
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + 25 ** 7)))
  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)
  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  const h1p = C1p === 0 ? 0 : ((Math.atan2(b1, a1p) * 180) / Math.PI + 360) % 360
  const h2p = C2p === 0 ? 0 : ((Math.atan2(b2, a2p) * 180) / Math.PI + 360) % 360

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp = 0
  if (C1p * C2p === 0) dhp = 0
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360
  else dhp = h2p - h1p + 360

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360)

  const Lpm = (L1 + L2) / 2
  const Cpm = (C1p + C2p) / 2

  let hpm = 0
  if (C1p * C2p === 0) hpm = h1p + h2p
  else if (Math.abs(h1p - h2p) <= 180) hpm = (h1p + h2p) / 2
  else if (h1p + h2p < 360) hpm = (h1p + h2p + 360) / 2
  else hpm = (h1p + h2p - 360) / 2

  const T =
    1 -
    0.17 * Math.cos(((hpm - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hpm * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hpm + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hpm - 63) * Math.PI) / 180)

  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2))
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2)
  const Sc = 1 + 0.045 * Cpm
  const Sh = 1 + 0.015 * Cpm * T
  const Rt = -Math.sin((2 * dTheta * Math.PI) / 180) * Rc

  return Math.sqrt(
    (dLp / (kL * Sl)) ** 2 +
      (dCp / (kC * Sc)) ** 2 +
      (dHp / (kH * Sh)) ** 2 +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
  )
}

/** True when colours collide or are visually too close at chip scale. */
export function colorsTooClose(hexA: string, hexB: string): boolean {
  const a = normalizeHex(hexA)
  const b = normalizeHex(hexB)
  if (!a || !b) return false
  if (a === b) return true

  const deltaE = ciede2000(a, b)
  if (deltaE < MIN_CIEDE2000) return true

  const ha = hexToHsl(a)
  const hb = hexToHsl(b)
  if (!ha || !hb) return false

  const hueDelta = circularHueDelta(ha.h, hb.h)
  const lightDelta = Math.abs(ha.l - hb.l)

  // Hue floor — greens pack tightly in HSL but Lab is more reliable;
  // still reject obvious same-family pairs when lightness is also close.
  if (hueDelta < MIN_HUE_DELTA_DEG && lightDelta < MIN_LIGHTNESS_DELTA) return true

  // Green zone is especially hard on small chips — slightly stricter.
  const inGreen = (ha.h >= 70 && ha.h <= 170) || (hb.h >= 70 && hb.h <= 170)
  if (inGreen && deltaE < MIN_CIEDE2000 + 2) return true

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

export function colorAtStep(lastHue: number, attempt = 0, bandIndex = 0): ColorCandidate {
  const hue = ((((Number(lastHue) || 0) + GOLDEN_ANGLE_DEG * (attempt + 1)) % 360) + 360) % 360
  const lightness = LIGHTNESS_BANDS[(bandIndex + attempt) % LIGHTNESS_BANDS.length]
  const saturation =
    SATURATION_BANDS[Math.floor((bandIndex + attempt) / 12) % SATURATION_BANDS.length]
  return {
    colorHex: hslToHex(hue, saturation, lightness),
    hue,
    saturation,
    lightness,
  }
}

/**
 * Pick the next unique colour for a school given existing hexes + last assigned hue.
 * Builds a dense HSL candidate grid, then prefers the colour nearest the golden-angle
 * continuation that maximises min CIEDE2000 distance to existing colours.
 */
export function pickUniqueTeacherColor(opts: {
  lastAssignedHue: number
  existingHexes: string[]
  assignedCount?: number
  maxAttempts?: number
}): ColorCandidate & { ok: boolean } {
  const existing = (opts.existingHexes || []).map(normalizeHex).filter(Boolean) as string[]
  const lastHue = Number.isFinite(opts.lastAssignedHue)
    ? Number(opts.lastAssignedHue)
    : -GOLDEN_ANGLE_DEG
  const preferredHue = (((lastHue + GOLDEN_ANGLE_DEG) % 360) + 360) % 360

  type Scored = ColorCandidate & { minD: number; preferDist: number }
  const candidates: Scored[] = []
  const hueStep = 6

  for (let h = 0; h < 360; h += hueStep) {
    for (let bi = 0; bi < LIGHTNESS_BANDS.length; bi++) {
      for (let si = 0; si < SATURATION_BANDS.length; si++) {
        const lightness = LIGHTNESS_BANDS[bi]
        const saturation = SATURATION_BANDS[si]
        const colorHex = hslToHex(h, saturation, lightness)
        if (existing.some((hex) => colorsTooClose(hex, colorHex))) continue
        const minD = existing.length
          ? Math.min(...existing.map((hex) => ciede2000(hex, colorHex)))
          : 100
        candidates.push({
          colorHex,
          hue: h,
          saturation,
          lightness,
          minD,
          preferDist: circularHueDelta(h, preferredHue),
        })
      }
    }
  }

  if (!candidates.length) {
    const fallback = colorAtStep(lastHue, 0, Number(opts.assignedCount) || existing.length)
    return { ...fallback, ok: false }
  }

  // Prefer strongest separation, then closeness to golden-angle continuation (deterministic).
  candidates.sort((a, b) => b.minD - a.minD || a.preferDist - b.preferDist || a.hue - b.hue)
  const best = candidates[0]
  return {
    colorHex: best.colorHex,
    hue: best.hue,
    saturation: best.saturation,
    lightness: best.lightness,
    ok: true,
  }
}

/** Probe how many successively unique colours we can place from a clean school. */
export function measureTeacherColorCapacity(maxProbe = 80): number {
  let lastHue = -GOLDEN_ANGLE_DEG
  const hexes: string[] = []
  for (let i = 0; i < maxProbe; i++) {
    const picked = pickUniqueTeacherColor({
      lastAssignedHue: lastHue,
      existingHexes: hexes,
      assignedCount: hexes.length,
    })
    if (!picked.ok) return hexes.length
    for (const prev of hexes) {
      if (colorsTooClose(prev, picked.colorHex)) return hexes.length
    }
    hexes.push(picked.colorHex)
    lastHue = picked.hue
  }
  return hexes.length
}

export const MISSING_TEACHER_COLOR = '#94A3B8'

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
