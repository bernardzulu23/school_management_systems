import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  embedTexts,
  isRetryableEmbeddingError,
  isProviderFallbackEligible,
  EMBEDDING_DIM,
} from '@/lib/rag/embed'

function makeVector(seed = 0) {
  return Array.from({ length: EMBEDDING_DIM }, (_, i) => (seed + i) * 0.001)
}

describe('rag embed helpers', () => {
  it('treats Voyage billing / rate-limit messages as retryable', () => {
    const msg =
      'You have not yet added your payment method in the billing page and will have reduced rate limits of 3 RPM'
    expect(isRetryableEmbeddingError(new Error(msg))).toBe(true)
    expect(isProviderFallbackEligible(new Error(msg))).toBe(true)
  })

  it('does not treat missing API key as fallback-eligible', () => {
    expect(
      isProviderFallbackEligible(new Error('VOYAGE_API_KEY is required for voyage embeddings'))
    ).toBe(false)
  })
})

describe('embedTexts provider chain', () => {
  const originalFetch = global.fetch
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.stubEnv('VOYAGE_API_KEY', 'voyage-test-key')
    vi.stubEnv('HUGGINGFACE_API_KEY', 'hf-test-key')
    delete process.env.OPENAI_API_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.JINA_API_KEY
    delete process.env.OPENROUTER_API_KEY
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env = { ...originalEnv }
    vi.unstubAllEnvs()
  })

  it('falls back through configured providers when primary fails', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key')
    vi.stubEnv('JINA_API_KEY', 'jina-key')
    vi.stubEnv('VOYAGE_RATE_LIMIT_SLEEP_MS', '1')
    vi.stubEnv('VOYAGE_EMBED_MAX_RETRIES', '1')
    vi.resetModules()
    const { embedTexts: embedWithFreshConfig } = await import('@/lib/rag/embed')

    let geminiCalls = 0
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('generativelanguage.googleapis.com')) {
        geminiCalls += 1
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'Rate limit exceeded' } }),
        }
      }
      if (String(url).includes('api.jina.ai')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { index: 0, embedding: makeVector(1) },
              { index: 1, embedding: makeVector(2) },
            ],
          }),
        }
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const vectors = await embedWithFreshConfig(['chunk one', 'chunk two'], {
      provider: 'gemini',
    })

    expect(geminiCalls).toBeGreaterThan(0)
    expect(vectors).toHaveLength(2)
    expect(vectors[0]).toHaveLength(EMBEDDING_DIM)
  }, 10000)

  it('falls back to HuggingFace when Voyage returns rate-limit errors', async () => {
    vi.stubEnv('VOYAGE_RATE_LIMIT_SLEEP_MS', '1')
    vi.stubEnv('VOYAGE_EMBED_MAX_RETRIES', '1')
    vi.resetModules()
    const { embedTexts: embedWithFreshConfig } = await import('@/lib/rag/embed')

    let voyageCalls = 0
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('voyageai.com')) {
        voyageCalls += 1
        return {
          ok: false,
          status: 429,
          json: async () => ({
            detail: 'Rate limit exceeded. Reduced limits of 3 RPM apply without payment method.',
          }),
        }
      }
      if (String(url).includes('huggingface.co')) {
        return {
          ok: true,
          status: 200,
          json: async () => [makeVector(1), makeVector(2)],
        }
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const vectors = await embedWithFreshConfig(['chunk one', 'chunk two'], {
      provider: 'voyage',
      fallbackProviders: ['huggingface'],
    })

    expect(voyageCalls).toBeGreaterThan(0)
    expect(vectors).toHaveLength(2)
    expect(vectors[0]).toHaveLength(EMBEDDING_DIM)
  }, 10000)

  it('batches Voyage requests with array input', async () => {
    const voyageBodies = []
    global.fetch = vi.fn(async (url, init) => {
      if (String(url).includes('voyageai.com')) {
        const body = JSON.parse(init.body)
        voyageBodies.push(body)
        const input = body.input
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: input.map((_, index) => ({ index, embedding: makeVector(index) })),
          }),
        }
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const chunks = Array.from({ length: 10 }, (_, i) => `chunk ${i}`)
    const vectors = await embedTexts(chunks, {
      provider: 'voyage',
      fallbackProviders: [],
    })

    expect(vectors).toHaveLength(10)
    expect(voyageBodies.length).toBeGreaterThan(1)
    for (const body of voyageBodies) {
      expect(Array.isArray(body.input)).toBe(true)
      expect(body.output_dimension).toBe(EMBEDDING_DIM)
    }
  })
})
