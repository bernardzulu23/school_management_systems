import {
  geminiGenerateContentUrl,
  geminiModelCandidates,
  getGeminiModel,
} from '@/lib/ai/gemini-config'
import type { AIProvider, AIMessage } from '@/lib/ai/types'

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const
  model = getGeminiModel()

  async isAvailable(): Promise<boolean> {
    return Boolean(String(process.env.GEMINI_API_KEY || '').trim())
  }

  async chat(messages: AIMessage[]): Promise<string> {
    const apiKey = String(process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? ''
    const userMsgs = messages.filter((m) => m.role !== 'system')

    const contents = userMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const body: Record<string, unknown> = { contents }

    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg }] }
    }

    let lastError: Error | null = null

    for (const model of geminiModelCandidates()) {
      try {
        const res = await fetch(`${geminiGenerateContentUrl(model)}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Gemini error ${res.status}: ${err}`)
        }

        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error('Gemini returned an empty response')
        }
        this.model = model
        return text
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const retryable =
          lastError.message.includes('404') ||
          lastError.message.includes('not found') ||
          lastError.message.includes('not supported')
        if (!retryable) throw lastError
      }
    }

    throw lastError || new Error('Gemini: all model candidates failed')
  }
}
