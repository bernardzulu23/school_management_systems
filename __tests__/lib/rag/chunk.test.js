import { describe, it, expect } from 'vitest'
import { chunkText } from '@/lib/rag/chunk'

describe('chunkText', () => {
  it('returns empty array for blank input', () => {
    expect(chunkText('   ')).toEqual([])
  })

  it('splits long text with overlap', () => {
    const text = 'a'.repeat(2500)
    const chunks = chunkText(text, 500)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].length).toBeLessThanOrEqual(2000)
  })
})
