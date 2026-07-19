import { describe, it, expect } from 'vitest'
import {
  decodeCdcLine,
  decodeCdcText,
  cleanCdcLine,
  decodeCdcTextAuto,
} from '@/lib/curriculum/cdcFontDecode'

describe('cdcFontDecode', () => {
  it('decodes +29 CDC font-offset lines with control characters', () => {
    // "2.1.2 Limits of Science" — encoded space is U+0003 (+29 → ' ')
    const encoded = '\x15\x11\x14\x11\x15\x03/LPLWV\x03RI\x036FLHQFH'
    expect(decodeCdcLine(encoded)).toBe('2.1.2 Limits of Science')
  })

  it('leaves already-readable lines unchanged (TOC dots stay dots)', () => {
    const readable = 'Suggested Teaching Methodologies ...... vii'
    expect(decodeCdcLine(readable)).toBe(readable)
  })

  it('cleans dotted leaders after decode', () => {
    expect(cleanCdcLine('Introduction to Chemistry...... 12')).toBe('Introduction to Chemistry 12')
  })

  it('decodes only control-bearing lines in a multi-line block', () => {
    const text = ['Apply laboratory safety', '\x15\x11\x14\x11\x15\x03/LPLWV'].join('\n')
    expect(decodeCdcText(text)).toBe(['Apply laboratory safety', '2.1.2 Limits'].join('\n'))
  })

  it('decodeCdcTextAuto skips when alreadyDecoded', () => {
    const raw = 'Nature of Biology'
    const out = decodeCdcTextAuto(raw, { alreadyDecoded: true })
    expect(out.text).toBe(raw)
    expect(out.shift).toBe(0)
  })
})
