import type { AIProvider, AIMessage } from '@/lib/ai/types'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const
  model = 'gemini-1.5-flash'

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

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
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
    return text
  }
}
