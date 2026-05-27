import { describe, it, expect } from 'vitest'
import { canUseRAG } from '@/lib/features/ragAccess'

describe('canUseRAG', () => {
  it('limits free tier retrieval', () => {
    const access = canUseRAG({ plan: 'trial' })
    expect(access.enabled).toBe(true)
    expect(access.topK).toBe(5)
    expect(access.embedProvider).toBe('huggingface')
    expect(access.reranking).toBe(false)
  })

  it('expands paid tier retrieval', () => {
    const access = canUseRAG({ plan: 'premium' })
    expect(access.topK).toBe(15)
    expect(access.reranking).toBe(true)
  })
})
