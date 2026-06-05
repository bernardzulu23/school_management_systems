import { GeminiProvider } from '@/lib/ai/providers/gemini'

/** @type {import('../provider').AIProvider} */
export const geminiProvider = {
  name: 'gemini',
  async isAvailable() {
    return new GeminiProvider().isAvailable()
  },
  async complete(request) {
    const gemini = new GeminiProvider()
    const messages = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: String(request.systemPrompt) })
    }
    messages.push({ role: 'user', content: String(request.userPrompt || '') })

    const text = await gemini.chat(messages)
    return {
      text,
      provider: 'gemini',
      modelUsed: gemini.model,
    }
  },
}
