import { describe, expect, it } from 'vitest'
import { buildActorLabel, diffFields, formatActorRole } from '@/lib/changelog/constants'

describe('changelog constants', () => {
  it('builds headteacher and HOD actor labels', () => {
    expect(buildActorLabel({ name: 'Mwansa Phiri', role: 'headteacher' })).toBe(
      'Headteacher — Mwansa Phiri'
    )
    expect(buildActorLabel({ name: 'Andrew Simwanza', role: 'hod', department: 'Sciences' })).toBe(
      'HOD Sciences — Andrew Simwanza'
    )
    expect(formatActorRole('admin')).toBe('Administrator')
  })

  it('diffs only changed fields', () => {
    const { changedFields, before, after } = diffFields(
      { startTime: '08:20', endTime: '09:00', dayOfWeek: 'Friday', updatedAt: 'a' },
      { startTime: '09:00', endTime: '09:40', dayOfWeek: 'Friday', updatedAt: 'b' }
    )
    expect(changedFields.sort()).toEqual(['endTime', 'startTime'])
    expect(before.startTime).toBe('08:20')
    expect(after.startTime).toBe('09:00')
  })
})
