/**
 * Groq API client for ZSMS AI features (lesson plans, stories, quizzes, etc.).
 * Set GROQ_API_KEY and optional GROQ_MODEL in .env / Vercel.
 */
import Groq from 'groq-sdk'

let groqSingleton: Groq | null = null

export function assertGroqConfigured(): void {
  if (!String(process.env.GROQ_API_KEY || '').trim()) {
    throw new Error('Missing GROQ_API_KEY')
  }
}

export function getGroqClient(): Groq {
  assertGroqConfigured()
  if (!groqSingleton) {
    groqSingleton = new Groq({ apiKey: String(process.env.GROQ_API_KEY).trim() })
  }
  return groqSingleton
}

/** Default: fast, capable model on Groq. Override with GROQ_MODEL (e.g. mixtral-8x7b-32768). */
export function getGroqModel(): string {
  return String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim()
}

export type GroqChatOptions = {
  prompt: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export type GroqChatResult = {
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  model: string
}

export async function groqChatCompletion(options: GroqChatOptions): Promise<GroqChatResult> {
  const groq = getGroqClient()
  const model = options.model || getGroqModel()

  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: 'user', content: options.prompt }],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
  })

  const content = String(completion.choices[0]?.message?.content || '')
  const promptTokens = Number(completion.usage?.prompt_tokens || 0)
  const completionTokens = Number(completion.usage?.completion_tokens || 0)

  return {
    content,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
    model,
  }
}

export function extractJSONObject(text: string): Record<string, unknown> | null {
  const s = String(text || '').trim()
  if (!s) return null

  const fenced = s.match(/```json\s*([\s\S]*?)\s*```/i) || s.match(/```\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : s

  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null

  try {
    return JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

export const GROQ_SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

export type GroqStreamOptions = GroqChatOptions & {
  onComplete?: (
    fullText: string,
    usage: { promptTokens: number; completionTokens: number }
  ) => Promise<void>
  onErrorMessage?: string
}

/** SSE stream compatible with useAIStream (`data: {"text":"..."}` + `[DONE]`). */
export function createGroqTextEventStream(options: GroqStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      let responseText = ''
      try {
        const groq = getGroqClient()
        const model = options.model || getGroqModel()

        const stream = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: options.prompt }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
          stream: true,
        })

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (!text) continue
          responseText += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }

        if (options.onComplete) {
          await options.onComplete(responseText, { promptTokens: 0, completionTokens: 0 })
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        const message =
          options.onErrorMessage || (error instanceof Error ? error.message : 'AI request failed')
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
        controller.close()
      }
    },
  })
}
