import { aiChain } from '@/lib/ai/provider-fallback'
import { logger } from '@/lib/utils/logger'
import type { AIMessage, AIResponse } from '@/lib/ai/types'

const log = logger({ route: 'AI:orchestrator' })

function messagesToPrompt(messages: AIMessage[]) {
  const system = messages.find((m) => m.role === 'system')?.content
  const parts = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      if (m.role === 'assistant') return `Assistant: ${m.content}`
      return m.content
    })
  return { prompt: parts.join('\n\n'), system }
}

function normalizeProvider(name: string): AIResponse['provider'] {
  const key = String(name || '').toLowerCase()
  if (key.includes('gemini')) return 'gemini'
  if (key.includes('groq')) return 'groq'
  if (key.includes('openrouter')) return 'openrouter'
  if (key.includes('openai')) return 'openai'
  if (key.includes('huggingface') || key.includes('hf')) return 'huggingface'
  return 'groq'
}

export async function generateWithFallback(messages: AIMessage[]): Promise<AIResponse> {
  const { prompt, system } = messagesToPrompt(messages)
  const result = await aiChain.generate(prompt, { system })
  log.info('AI provider used', { provider: result.provider, model: result.model })
  return {
    text: result.text,
    provider: normalizeProvider(result.provider),
    model: result.model,
  }
}

export function isAnyAIProviderConfigured(): boolean {
  return aiChain.isConfigured()
}

export function getAIProviderStatus() {
  return aiChain.getProviderStatus()
}
