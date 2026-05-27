/**
 * Groq helpers for ZSMS — backed by Vercel AI SDK (@/lib/ai/client).
 * Keeps the legacy API used by routes and lib/aiml tools.
 */
import {
  assertGroqConfigured,
  generateAIText,
  GROQ_MODEL,
  groqModel,
  streamAIText,
} from '@/lib/ai/client'

export { assertGroqConfigured, GROQ_MODEL, groqModel }

export function getGroqModel(): string {
  return GROQ_MODEL
}

/** @deprecated use getGroqModel — kept for aiml tools */
export function getGroqClient(): { configured: true } {
  assertGroqConfigured()
  return { configured: true }
}

export type GroqChatOptions = {
  prompt: string
  maxTokens?: number
  temperature?: number
  model?: string
  system?: string
}

export type GroqChatResult = {
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  model: string
}

export async function groqChatCompletion(options: GroqChatOptions): Promise<GroqChatResult> {
  const { text, usage, model } = await generateAIText(options.prompt, {
    system: options.system,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  })
  return {
    content: text,
    usage: {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    },
    model: options.model || model,
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
  /** Sent as the first SSE event before text chunks (e.g. ragReferences). */
  meta?: Record<string, unknown>
}

/** SSE stream compatible with useAIStream (`data: {"text":"..."}` + `[DONE]`). */
export function createGroqTextEventStream(options: GroqStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      let responseText = ''
      try {
        if (options.meta && Object.keys(options.meta).length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(options.meta)}\n\n`))
        }

        const { streamAITextWithFallback } = await import('@/lib/ai/client')
        const { result, model } = await streamAITextWithFallback(options.system, options.prompt, {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          model: options.model,
        })

        for await (const chunk of result.textStream) {
          if (!chunk) continue
          responseText += chunk
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
        }

        const usage = result.usage
          ? {
              promptTokens: Number(result.usage.inputTokens ?? 0),
              completionTokens: Number(result.usage.outputTokens ?? 0),
            }
          : { promptTokens: 0, completionTokens: 0 }

        if (options.onComplete) {
          await options.onComplete(responseText, usage, model)
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
