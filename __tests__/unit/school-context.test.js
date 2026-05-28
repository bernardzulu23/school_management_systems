import { describe, it, expect, vi } from 'vitest'

const executeRaw = vi.fn()
const findMany = vi.fn().mockResolvedValue([{ id: 's1' }])

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(async (fn) =>
      fn({
        $executeRaw: executeRaw,
        student: { findMany },
      })
    ),
  },
}))

import { withSchoolContext } from '@/lib/db/school-context'

describe('withSchoolContext', () => {
  it('sets app.current_school_id and runs callback', async () => {
    const rows = await withSchoolContext('school-abc', (tx) => tx.student.findMany())
    expect(executeRaw).toHaveBeenCalled()
    expect(findMany).toHaveBeenCalled()
    expect(rows).toEqual([{ id: 's1' }])
  })

  it('throws without schoolId', async () => {
    await expect(withSchoolContext('', () => Promise.resolve())).rejects.toThrow(/schoolId/)
  })
})
