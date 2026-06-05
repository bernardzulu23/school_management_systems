import { env } from '@/lib/config/env'
import type { AIProvider, AIMessage } from '@/lib/ai/types'

export class GroqChatProvider implements AIProvider {
  name = 'groq' as const
  model = String(process.env.GROQ_MODEL || env.groqModel || 'llama-3.3-70b-versatile').trim()

  async isAvailable(): Promise<boolean> {
    return Boolean(String(process.env.GROQ_API_KEY || env.groqApiKey || '').trim())
  }

  async chat(messages: AIMessage[]): Promise<string> {
    const apiKey = String(process.env.GROQ_API_KEY || env.groqApiKey || '').trim()
    if (!apiKey) throw new Error('GROQ_API_KEY not set')

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Groq returned an empty response')
    }
    return content
  }
}
