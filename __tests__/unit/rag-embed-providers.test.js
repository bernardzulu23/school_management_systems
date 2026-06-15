import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildEmbedProviderChain,
  getConfiguredEmbedProviders,
  resolveDefaultEmbedProvider,
} from '@/lib/rag/embedProviders'

describe('embedProviders registry', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists all configured providers in priority order', () => {
    vi.stubEnv('GEMINI_API_KEY', 'g')
    vi.stubEnv('JINA_API_KEY', 'j')
    vi.stubEnv('OPENROUTER_API_KEY', 'o')
    expect(getConfiguredEmbedProviders()).toEqual(['gemini', 'jina', 'openrouter'])
    expect(resolveDefaultEmbedProvider()).toBe('gemini')
  })

  it('builds a chain that tries every configured provider', () => {
    vi.stubEnv('VOYAGE_API_KEY', 'v')
    vi.stubEnv('JINA_API_KEY', 'j')
    const chain = buildEmbedProviderChain('voyage')
    expect(chain).toEqual(['voyage', 'jina'])
  })
})
