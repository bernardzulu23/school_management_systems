import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    student: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    attendance: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    result: {
      findFirst: vi.fn(),
    },
  },
}))

import { handleParentUssd } from '@/lib/ussd/parent-portal'

describe('handleParentUssd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows main menu on empty text', async () => {
    const res = await handleParentUssd('260971234567', '')
    expect(res).toMatch(/^CON /)
    expect(res).toContain('attendance')
  })

  it('ends on invalid option', async () => {
    const res = await handleParentUssd('260971234567', '9')
    expect(res).toMatch(/^END /)
  })
})
