import { describe, expect, it } from 'vitest'
import { newAnnouncementDraftId, TIMETABLE_CHANNEL } from '@/lib/offline/admin-ops'

describe('admin-ops helpers', () => {
  it('creates local announcement draft ids', () => {
    expect(newAnnouncementDraftId().startsWith('local:')).toBe(true)
  })

  it('exports timetable draft channel name', () => {
    expect(TIMETABLE_CHANNEL).toBe('timetable-draft')
  })
})
