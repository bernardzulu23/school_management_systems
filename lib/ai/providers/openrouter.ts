import type { AIProvider, AIMessage } from '@/lib/ai/types'

const FREE_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
]

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter' as const
  model = FREE_MODELS[0]

  async isAvailable(): Promise<boolean> {
    return Boolean(String(process.env.OPENROUTER_API_KEY || '').trim())
  }

  async chat(messages: AIMessage[]): Promise<string> {
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim()
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

    const errors: string[] = []

    for (const model of FREE_MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://zambia-schools.example',
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
