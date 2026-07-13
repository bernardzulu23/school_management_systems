import { describe, expect, it } from 'vitest'
import {
  colorsTooClose,
  colorAtStep,
  pickUniqueTeacherColor,
  GOLDEN_ANGLE_DEG,
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

  it('treats nearby hues as too close', () => {
    const a = colorAtStep(-GOLDEN_ANGLE_DEG, 0, 0).colorHex
    // same hue different tiny lightness is still same color family — build two close manually
    expect(colorsTooClose('#E6194B', '#E81A4C')).toBe(true)
  })

  it('assigns 40+ distinct colours without pairwise near-collision', () => {
    let lastHue = -GOLDEN_ANGLE_DEG
    const hexes: string[] = []
    for (let i = 0; i < 45; i++) {
      const picked = pickUniqueTeacherColor({
        lastAssignedHue: lastHue,
        existingHexes: hexes,
        assignedCount: hexes.length,
      })
      if (!picked.ok) {
        throw new Error(`Failed to pick colour at index ${i} (have ${hexes.length})`)
      }
      for (const prev of hexes) {
        expect(colorsTooClose(prev, picked.colorHex)).toBe(false)
      }
      hexes.push(picked.colorHex)
      lastHue = picked.hue
    }
    expect(new Set(hexes).size).toBe(45)
  })
})
