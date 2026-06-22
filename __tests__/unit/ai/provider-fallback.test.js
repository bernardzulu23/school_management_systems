import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import {
  geminiGenerateContentUrl,
  geminiModelCandidates,
  getGeminiModel,
} from '@/lib/ai/gemini-config'

describe('gemini-config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.GEMINI_MODEL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('defaults to gemini-2.0-flash', () => {
    expect(getGeminiModel()).toBe('gemini-2.0-flash')
  })

  it('respects GEMINI_MODEL env', async () => {
    process.env.GEMINI_MODEL = 'gemini-custom'
    vi.resetModules()
    const mod = await import('@/lib/ai/gemini-config')
    expect(mod.getGeminiModel()).toBe('gemini-custom')
  })

  it('builds generateContent URL from model name', () => {
    expect(geminiGenerateContentUrl('gemini-2.0-flash')).toContain(
      'models/gemini-2.0-flash:generateContent'
    )
  })

  it('lists fallback model candidates', () => {
    const models = geminiModelCandidates()
    expect(models[0]).toBe('gemini-2.0-flash')
    expect(models.length).toBeGreaterThan(1)
  })
})

describe('AI provider chain order', () => {
  it('prefers Groq before Gemini', async () => {
    const { aiChain } = await import('@/lib/ai/provider-fallback')
    const status = aiChain.getProviderStatus()
    const names = status.map((p) => p.name)
    expect(names.indexOf('Groq')).toBeLessThan(names.indexOf('Gemini'))
  })
})
