import { describe, it, expect } from 'vitest'
import {
  buildReportingStreamKey,
  validateSchoolLocation,
  reportingStreamLabel,
} from '@/lib/platform/reportingStream'

describe('reportingStream', () => {
  it('builds stable stream key from province and district', () => {
    expect(buildReportingStreamKey('Lusaka', 'Kafue')).toBe('lusaka__kafue')
    expect(buildReportingStreamKey('North-Western', 'Solwezi')).toBe('north-western__solwezi')
  })

  it('validates required province and district', () => {
    expect(validateSchoolLocation({}).ok).toBe(false)
    expect(validateSchoolLocation({ province: 'Lusaka' }).ok).toBe(false)
    const ok = validateSchoolLocation({ province: 'Eastern', district: 'Chipata' })
    expect(ok.ok).toBe(true)
    expect(ok.reportingStreamKey).toBe('eastern__chipata')
  })

  it('formats stream label', () => {
    expect(reportingStreamLabel('Copperbelt', 'Ndola')).toBe('Copperbelt — Ndola')
  })
})
