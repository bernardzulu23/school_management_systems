import { GroqChatProvider } from '@/lib/ai/providers/groq-chat'
import { GeminiProvider } from '@/lib/ai/providers/gemini'
import { OpenRouterProvider } from '@/lib/ai/providers/openrouter'
import { logger } from '@/lib/utils/logger'
import type { AIMessage, AIProvider, AIResponse } from '@/lib/ai/types'

const log = logger({ route: 'AI:orchestrator' })

const providerChain: AIProvider[] = [
  new GroqChatProvider(),
  new GeminiProvider(),
  new OpenRouterProvider(),
]

export async function generateWithFallback(messages: AIMessage[]): Promise<AIResponse> {
  const errors: string[] = []

  for (const provider of providerChain) {
    if (!(await provider.isAvailable())) continue

    try {
      const text = await provider.chat(messages)
      log.info('AI provider used', { provider: provider.name, model: provider.model })
      return { text, provider: provider.name, model: provider.model }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.warn('AI provider failed', { provider: provider.name, message: msg })
      errors.push(`${provider.name}: ${msg}`)
    }
  }

  if (errors.length === 0) {
    throw new Error(
      'No AI provider is configured. Set GROQ_API_KEY and/or GEMINI_API_KEY in environment variables.'
    )
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
}

export function isAnyAIProviderConfigured(): boolean {
  return Boolean(
    String(process.env.GROQ_API_KEY || '').trim() ||
    String(process.env.GEMINI_API_KEY || '').trim() ||
    String(process.env.OPENROUTER_API_KEY || '').trim()
  )
}
