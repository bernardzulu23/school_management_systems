import { describe, expect, it } from 'vitest'
import {
  buildAttendanceSMS,
  extractParentContacts,
  formatZambianPhone,
  isParentSmsEnabledForStatus,
} from '@/lib/attendance/parentNotifications'

describe('parentNotifications', () => {
  it('formatZambianPhone normalizes local numbers', () => {
    expect(formatZambianPhone('0971234567')).toBe('+260971234567')
    expect(formatZambianPhone('+260971234567')).toBe('+260971234567')
    expect(formatZambianPhone('971234567')).toBe('+260971234567')
    expect(formatZambianPhone('')).toBeNull()
  })

  it('extractParentContacts collects guardian and parent phones', () => {
    expect(
      extractParentContacts({
        guardian_contact: '0971111111',
        parent_father_contact: '0962222222',
        parent_mother_contact: '',
      })
    ).toEqual(['0971111111', '0962222222'])
  })

  it('buildAttendanceSMS returns absent alert text', () => {
    const msg = buildAttendanceSMS({
      studentName: 'Jane Banda',
      className: 'Form 1A',
      status: 'absent',
      date: '2026-06-12',
      schoolName: 'Test School',
      timeStr: '08:00',
    })
    expect(msg).toContain('ABSENT')
    expect(msg).toContain('Jane Banda')
    expect(msg).toContain('Form 1A')
    expect(msg).toContain('Test School')
  })

  it('buildAttendanceSMS returns null for unknown status', () => {
    expect(
      buildAttendanceSMS({
        studentName: 'A',
        className: 'B',
        status: 'unknown',
        date: new Date(),
        schoolName: 'S',
      })
    ).toBeNull()
  })

  it('isParentSmsEnabledForStatus respects school prefs', () => {
    const prefs = {
      parentSmsAbsent: true,
      parentSmsLate: true,
      parentSmsPresent: false,
      parentSmsExcused: false,
    }
    expect(isParentSmsEnabledForStatus(prefs, 'absent')).toBe(true)
    expect(isParentSmsEnabledForStatus(prefs, 'present')).toBe(false)
    expect(isParentSmsEnabledForStatus(prefs, 'excused')).toBe(false)
  })
})
