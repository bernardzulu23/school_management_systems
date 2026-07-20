import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveStaticFallback = vi.fn(() => null)
const buildFallbackContextBlock = vi.fn(() => '')
const resolveCurriculumContext = vi.fn()
const buildCurriculumContextBlock = vi.fn()

vi.mock('@/lib/features/ragAccess', () => ({
  canUseRAG: () => ({ enabled: false, topK: 5 }),
}))
vi.mock('@/lib/rag/embedProviders', () => ({
  hasAnyEmbedProvider: () => false,
}))
vi.mock('@/lib/rag/retrieve', () => ({
  retrieveContext: vi.fn(),
  chunksToRagRefs: vi.fn(() => []),
  chunksToRagBlock: vi.fn(() => ''),
}))
vi.mock('@/lib/ai/curriculum-context', () => ({
  resolveCurriculumContext: (...args) => resolveCurriculumContext(...args),
  buildCurriculumContextBlock: (...args) => buildCurriculumContextBlock(...args),
}))
vi.mock('@/lib/ai/fallback-resolver', () => ({
  resolveStaticFallback: (...args) => resolveStaticFallback(...args),
  buildFallbackContextBlock: (...args) => buildFallbackContextBlock(...args),
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
  captureWarning: vi.fn(),
  captureInfo: vi.fn(),
}))

import { buildRagContextForQuery, appendRagToSystemPrompt } from '@/lib/ai/rag-context'

describe('rag-context TM fallback vs CDC', () => {
  beforeEach(() => {
    resolveStaticFallback.mockClear()
    buildFallbackContextBlock.mockClear()
    resolveCurriculumContext.mockReset()
    buildCurriculumContextBlock.mockReset()
  })

  it('skips TM probe for Form 3+ when CDC curriculum block already grounds', async () => {
    resolveCurriculumContext.mockResolvedValue({ type: 'unit', subject: 'English' })
    buildCurriculumContextBlock.mockReturnValue({
      block: 'CDC syllabus block for English Form 3',
      refs: [{ ref: 1 }],
      enabled: true,
      source: 'english-syllabus',
      materialId: 'english-syllabus',
    })

    const result = await buildRagContextForQuery({
      query: 'English friendship',
      schoolId: 'school-1',
      schoolPlan: 'pro',
      subject: 'English',
      gradeLevel: 'Form 3',
      topic: 'friendship',
    })

    expect(resolveStaticFallback).not.toHaveBeenCalled()
    expect(result.block).toContain('CDC syllabus block')
    expect(result.enabled).toBe(true)
    expect(result.fallbackTier).toBeNull()
  })

  it('still works when TM fallback is null and CDC is absent', async () => {
    resolveCurriculumContext.mockResolvedValue(null)
    resolveStaticFallback.mockReturnValue(null)
    buildFallbackContextBlock.mockReturnValue('')

    const result = await buildRagContextForQuery({
      query: 'Physics waves',
      schoolId: 'school-1',
      subject: 'Physics',
      gradeLevel: 'Form 3',
      topic: 'waves',
    })

    expect(resolveStaticFallback).toHaveBeenCalled()
    expect(result.block).toBe('')
    const prompt = appendRagToSystemPrompt('Write a story about waves.', result.block)
    expect(prompt).toBe('Write a story about waves.')
  })

  it('tries TM for Form 1 even when CDC grounds (enrichment)', async () => {
    resolveCurriculumContext.mockResolvedValue({ type: 'cdc', subject: 'Chemistry' })
    buildCurriculumContextBlock.mockReturnValue({
      block: 'CDC chemistry',
      refs: [],
      enabled: true,
      source: 'chemistry-cdc-2024',
    })
    resolveStaticFallback.mockReturnValue({
      tier: 'A',
      subjectSlug: 'chemistry',
      form: 1,
      topicSlug: 'matter',
      path: '/tmp',
      data: { lesson: { title: 'Matter' } },
    })
    buildFallbackContextBlock.mockReturnValue('Teaching-module fallback (Form 1)')

    const result = await buildRagContextForQuery({
      query: 'Chemistry matter',
      schoolId: 'school-1',
      subject: 'Chemistry',
      gradeLevel: 'Form 1',
      topic: 'matter',
    })

    expect(resolveStaticFallback).toHaveBeenCalledWith('Chemistry', 'Form 1', 'matter')
    expect(result.block).toContain('CDC chemistry')
    expect(result.block).toContain('Teaching-module fallback')
    expect(result.fallbackTier).toBe('A')
  })
})
