import { generateAIText } from '@/lib/ai/client'
import { env } from '@/lib/config/env'

/** @type {import('../provider').AIProvider} */
export const groqProvider = {
  name: 'groq',
  async isAvailable() {
    return Boolean(String(env.groqApiKey || process.env.GROQ_API_KEY || '').trim())
  },
  async complete(request) {
    const system = String(request.systemPrompt || '')
    const user = String(request.userPrompt || '')
    const combined =
      request.responseFormat === 'json'
        ? `${system}\n\nRespond ONLY with valid JSON.\n\n${user}`
        : `${system}\n\n${user}`

    const model = String(process.env.GROQ_MODEL || env.groqModel || 'llama-3.3-70b-versatile')
    const result = await generateAIText(combined, {
      model,
      maxTokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.4,
    })

    return {
      text: String(result?.text || ''),
      provider: 'groq',
      modelUsed: model,
      tokensUsed: result?.usage?.totalTokens,
    }
  },
}
