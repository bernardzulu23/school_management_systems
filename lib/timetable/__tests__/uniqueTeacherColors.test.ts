import { describe, expect, it } from 'vitest'
import {
  colorsTooClose,
  ciede2000,
  colorAtStep,
  pickUniqueTeacherColor,
  measureTeacherColorCapacity,
  GOLDEN_ANGLE_DEG,
  MIN_CIEDE2000,
  normalizeHex,
} from '@/lib/timetable/uniqueTeacherColors'

describe('uniqueTeacherColors', () => {
  it('normalizes hex', () => {
    expect(normalizeHex('2563eb')).toBe('#2563EB')
    expect(normalizeHex('#AaBbCc')).toBe('#AABBCC')
  })

  it('treats identical hex as too close', () => {
    expect(colorsTooClose('#2563EB', '#2563eb')).toBe(true)
  })

  it('rejects near-identical greens that previously passed hue-only checks', () => {
    expect(colorsTooClose('#1FC14F', '#1FC185')).toBe(true)
    expect(ciede2000('#1FC14F', '#1FC185')).toBeLessThan(MIN_CIEDE2000)
  })

  it('rejects similar green family cluster members', () => {
    expect(colorsTooClose('#348C17', '#178C21')).toBe(true)
    expect(colorsTooClose('#348C17', '#61A12B')).toBe(true)
  })

  it('rejects nearby magenta/pink pairs', () => {
    expect(colorsTooClose('#E03E95', '#E03E5F')).toBe(true)
  })

  it('treats obviously different hues as distinct', () => {
    expect(colorsTooClose('#9E1A1A', '#227AD3')).toBe(false)
  })

  it('assigns as many distinct colours as capacity allows without pairwise near-collision', () => {
    const capacity = measureTeacherColorCapacity(80)
    expect(capacity).toBeGreaterThanOrEqual(24)

    let lastHue = -GOLDEN_ANGLE_DEG
    const hexes: string[] = []
    const target = Math.min(capacity, 24)
    for (let i = 0; i < target; i++) {
      const picked = pickUniqueTeacherColor({
        lastAssignedHue: lastHue,
        existingHexes: hexes,
        assignedCount: hexes.length,
      })
      expect(picked.ok).toBe(true)
      for (const prev of hexes) {
        expect(colorsTooClose(prev, picked.colorHex)).toBe(false)
      }
      hexes.push(picked.colorHex)
      lastHue = picked.hue
    }
    expect(new Set(hexes).size).toBe(target)
  }, 30_000)

  it('reports realistic chip-scale capacity', () => {
    const capacity = measureTeacherColorCapacity(80)
    expect(capacity).toBeLessThanOrEqual(64)
    expect(capacity).toBeGreaterThanOrEqual(24)
    expect(colorAtStep(-GOLDEN_ANGLE_DEG, 0, 0).colorHex).toMatch(/^#[0-9A-F]{6}$/)
  }, 30_000)
})
