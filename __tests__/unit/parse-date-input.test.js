import { parseDateInput } from '@/lib/utils/formHelpers'

describe('parseDateInput', () => {
  const ymd = (d) =>
    d
      ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      : null

  it('parses YYYY-MM-DD and YYYY/MM/DD', () => {
    expect(ymd(parseDateInput('2010-05-15'))).toBe('2010-05-15')
    expect(ymd(parseDateInput('2010/05/15'))).toBe('2010-05-15')
    expect(ymd(parseDateInput('2010.5.15'))).toBe('2010-05-15')
  })

  it('parses unambiguous DD/MM/YYYY', () => {
    expect(ymd(parseDateInput('15/05/2010'))).toBe('2010-05-15')
    expect(ymd(parseDateInput('15-05-2010'))).toBe('2010-05-15')
  })

  it('parses unambiguous MM/DD/YYYY', () => {
    expect(ymd(parseDateInput('05/15/2010'))).toBe('2010-05-15')
    expect(ymd(parseDateInput('5/15/2010'))).toBe('2010-05-15')
  })

  it('prefers DD/MM when ambiguous', () => {
    // 05/06/2010 → 5 June (DD/MM), not 6 May
    expect(ymd(parseDateInput('05/06/2010'))).toBe('2010-06-05')
  })

  it('rejects invalid dates', () => {
    expect(parseDateInput('32/01/2010')).toBeNull()
    expect(parseDateInput('2010-13-01')).toBeNull()
    expect(parseDateInput('not-a-date')).toBeNull()
    expect(parseDateInput('')).toBeNull()
  })
})
