import { describe, expect, it } from 'vitest'
import { issueTwinAuthTicket, verifyTwinAuthTicket } from '@/lib/attendance/twinAuthTicket'

describe('twinAuthTicket', () => {
  it('issues a ticket that verifies for matching context', () => {
    const { twinAuthToken } = issueTwinAuthTicket({
      schoolId: 'sch1',
      sessionId: 'ses1',
      studentId: 'stu1',
    })
    const ok = verifyTwinAuthTicket(twinAuthToken, {
      schoolId: 'sch1',
      sessionId: 'ses1',
      studentId: 'stu1',
    })
    expect(ok.ok).toBe(true)
  })

  it('rejects mismatched student', () => {
    const { twinAuthToken } = issueTwinAuthTicket({
      schoolId: 'sch1',
      sessionId: 'ses1',
      studentId: 'stu1',
    })
    const bad = verifyTwinAuthTicket(twinAuthToken, {
      schoolId: 'sch1',
      sessionId: 'ses1',
      studentId: 'other',
    })
    expect(bad.ok).toBe(false)
    expect(bad.code).toBe('TWIN_AUTH_TOKEN_MISMATCH')
  })

  it('rejects forged tokens', () => {
    const forged = 'eyJ2IjoxfQ.not-a-real-sig'
    const bad = verifyTwinAuthTicket(forged, {
      schoolId: 'sch1',
      sessionId: 'ses1',
      studentId: 'stu1',
    })
    expect(bad.ok).toBe(false)
  })
})
