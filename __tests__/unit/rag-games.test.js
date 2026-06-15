import { describe, it, expect } from 'vitest'
import { computePlayStreak } from '@/lib/games/awardBadges'
import { chunksToRagRefs, chunksToRagBlock } from '@/lib/rag/retrieve'

describe('computePlayStreak', () => {
  it('returns zero for empty history', () => {
    expect(computePlayStreak([])).toEqual({ current: 0, longest: 0 })
  })

  it('counts consecutive days including today', () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const yesterday = new Date(today.getTime() - 86400000)
    const streak = computePlayStreak([today, yesterday])
    expect(streak.current).toBeGreaterThanOrEqual(2)
    expect(streak.longest).toBeGreaterThanOrEqual(2)
  })
})

describe('rag chunk helpers', () => {
  it('maps chunks to refs with excerpts', () => {
    const refs = chunksToRagRefs([
      {
        id: 'c1',
        materialId: 'm1',
        materialTitle: 'Biology Notes',
        materialSubject: 'Biology',
        chunkIndex: 0,
        similarity: 0.92,
        content: 'Photosynthesis converts light energy.',
      },
    ])
    expect(refs).toHaveLength(1)
    expect(refs[0].ref).toBe(1)
    expect(refs[0].materialTitle).toBe('Biology Notes')
    expect(refs[0].excerpt).toContain('Photosynthesis')
  })

  it('builds rag block with ref labels', () => {
    const block = chunksToRagBlock([
      {
        materialTitle: 'ICT',
        materialSubject: 'ICT',
        chunkIndex: 2,
        content: 'CPU is the brain of the computer.',
      },
    ])
    expect(block).toContain('[Ref 1]')
    expect(block).toContain('CPU')
  })
})
