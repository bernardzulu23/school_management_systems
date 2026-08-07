import { describe, it, expect } from 'vitest'
import { normalizeCellValue } from '@/lib/excel/workbook'
import { normalizeZambianPhoneInput } from '@/lib/uploads/zambianPhone'

describe('normalizeCellValue', () => {
  it('returns empty for nullish', () => {
    expect(normalizeCellValue(null)).toBe('')
    expect(normalizeCellValue(undefined)).toBe('')
  })

  it('formats Date as YYYY-MM-DD UTC', () => {
    expect(normalizeCellValue(new Date(Date.UTC(2010, 4, 15)))).toBe('2010-05-15')
  })

  it('unwraps hyperlink email cells', () => {
    expect(
      normalizeCellValue({
        text: 'user@school.edu.zm',
        hyperlink: 'mailto:user@school.edu.zm',
      })
    ).toBe('user@school.edu.zm')
    expect(normalizeCellValue({ hyperlink: 'mailto:only@link.zm' })).toBe('only@link.zm')
  })

  it('joins rich text', () => {
    expect(normalizeCellValue({ richText: [{ text: '2uy' }, { text: 'GEBdW' }] })).toBe('2uyGEBdW')
  })

  it('uses formula result', () => {
    expect(normalizeCellValue({ formula: 'A1', result: 'ok@school.zm' })).toBe('ok@school.zm')
  })

  it('stringifies numbers without becoming [object Object]', () => {
    expect(normalizeCellValue(977994426)).toBe('977994426')
    expect(normalizeCellValue({ nested: true })).toBe('')
  })
})

describe('normalizeZambianPhoneInput', () => {
  it('pads 9-digit numbers missing a leading 0', () => {
    expect(normalizeZambianPhoneInput(977994426)).toBe('0977994426')
    expect(normalizeZambianPhoneInput('977994426')).toBe('0977994426')
  })

  it('leaves valid local and +260 numbers alone', () => {
    expect(normalizeZambianPhoneInput('0977994426')).toBe('0977994426')
    expect(normalizeZambianPhoneInput('+260977994426')).toBe('+260977994426')
  })
})
