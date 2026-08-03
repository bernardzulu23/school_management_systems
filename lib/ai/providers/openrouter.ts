import type { AIProvider, AIMessage } from '@/lib/ai/types'
import { aiHttpFetch } from '@/lib/ai/ai-http'

/** Preferred chat models when OPENROUTER_MODEL is unset or a given model fails. */
const MODEL_CANDIDATES = [
  String(process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim(),
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
  'meta-llama/llama-3.3-70b-instruct',
].filter((m, i, arr) => m && arr.indexOf(m) === i)

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter' as const
  model = MODEL_CANDIDATES[0]

  async isAvailable(): Promise<boolean> {
    return Boolean(String(process.env.OPENROUTER_API_KEY || '').trim())
  }

  async chat(messages: AIMessage[]): Promise<string> {
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim()
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

    const errors: string[] = []

    for (const model of MODEL_CANDIDATES) {
      try {
        const res = await aiHttpFetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://bluepeacktechnologies.com',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Zambian School Management System',
          },
          body: JSON.stringify({ model, messages, max_tokens: 2048 }),
        })

        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const content = data?.choices?.[0]?.message?.content
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('OpenRouter returned an empty response')
        }
        this.model = model
        return content
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${model}: ${msg}`)
      }
    }

    throw new Error(`OpenRouter all models failed:\n${errors.join('\n')}`)
  }
}
