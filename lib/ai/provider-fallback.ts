import { generateWithFallback, isAnyAIProviderConfigured } from '@/lib/ai/orchestrator'
import { streamAITextWithFallback } from '@/lib/ai/client'
import type { AIMessage } from '@/lib/ai/types'

export const AI_SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

export type AIChainGenerateOptions = {
  system?: string
  maxTokens?: number
  temperature?: number
}

export type AIChainStreamOptions = AIChainGenerateOptions & {
  prompt: string
  meta?: Record<string, unknown>
  plainText?: boolean
  onErrorMessage?: string
  onComplete?: (
    fullText: string,
    info: { provider: string; model: string; promptTokens: number; completionTokens: number }
  ) => Promise<void>
}

export type AIChainTextEventOptions = {
  text: string
  provider: string
  model: string
  meta?: Record<string, unknown>
  plainText?: boolean
}

function buildMessages(prompt: string, system?: string): AIMessage[] {
  const messages: AIMessage[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })
  return messages
}

function encodeSseEvent(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

/**
 * Multi-provider AI chain: Groq → Gemini → OpenRouter (non-streaming).
 */
export const aiChain = {
  isConfigured: isAnyAIProviderConfigured,

  async generate(prompt: string, options: AIChainGenerateOptions = {}) {
    const result = await generateWithFallback(buildMessages(prompt, options.system))
    return {
      text: result.text,
      provider: result.provider,
      model: result.model,
    }
  },

  /**
   * Wrap a completed generate() result as an SSE stream for useAIStream clients.
   */
  textToEventStream(options: AIChainTextEventOptions): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        try {
          const meta = options.meta || {}
          if (Object.keys(meta).length > 0) {
            controller.enqueue(encodeSseEvent(meta))
          }

          let finalText = options.text
          if (options.plainText) {
            const { sanitizePlainText } = await import('@/lib/ai/plain-text')
            finalText = sanitizePlainText(finalText)
          }

          controller.enqueue(encodeSseEvent({ text: finalText, replace: true }))
          controller.enqueue(
            encodeSseEvent({ generatedBy: options.provider, model: options.model })
          )
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI request failed'
          controller.enqueue(encodeSseEvent({ error: message }))
          controller.close()
        }
      },
    })
  },

  /**
   * SSE stream compatible with useAIStream (`data: {"text":"..."}` + `[DONE]`).
   * Tries full generate chain first (Groq → Gemini → OpenRouter), then streaming fallback.
   */
  createTextEventStream(options: AIChainStreamOptions): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        let responseText = ''
        let provider = 'unknown'
        let model = 'unknown'

        try {
          const meta = {
            ...(options.meta || {}),
          }

          if (Object.keys(meta).length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(meta)}\n\n`))
          }

          try {
            const generated = await aiChain.generate(options.prompt, {
              system: options.system,
              maxTokens: options.maxTokens,
              temperature: options.temperature,
            })

            provider = generated.provider
            model = generated.model
            responseText = generated.text

            const { sanitizePlainText } = await import('@/lib/ai/plain-text')
            const finalText = options.plainText ? sanitizePlainText(responseText) : responseText

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: finalText, replace: true })}\n\n`)
            )

            if (options.onComplete) {
              await options.onComplete(finalText, {
                provider,
                model,
                promptTokens: 0,
                completionTokens: 0,
              })
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ generatedBy: provider, model })}\n\n`)
            )
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          } catch {
            // Full provider chain failed — try streaming Groq/Gemini before giving up.
          }

          try {
            const streamed = await streamAITextWithFallback(options.system, options.prompt, {
              maxTokens: options.maxTokens,
              temperature: options.temperature,
            })
            provider = streamed.provider || 'groq'
            model = streamed.model || 'unknown'

            const { sanitizePlainText } = await import('@/lib/ai/plain-text')

            for await (const chunk of streamed.result.textStream) {
              if (!chunk) continue
              responseText += chunk
              if (options.plainText) {
                const cleaned = sanitizePlainText(responseText)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: cleaned, replace: true })}\n\n`)
                )
              } else {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
              }
            }

            const usage = streamed.result.usage
              ? await streamed.result.usage
              : { inputTokens: 0, outputTokens: 0 }

            const finalText = options.plainText
              ? (await import('@/lib/ai/plain-text')).sanitizePlainText(responseText)
              : responseText

            if (options.onComplete) {
              await options.onComplete(finalText, {
                provider,
                model,
                promptTokens: Number(usage?.inputTokens ?? 0),
                completionTokens: Number(usage?.outputTokens ?? 0),
              })
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ generatedBy: provider, model })}\n\n`)
            )
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          } catch (streamError) {
            throw streamError
          }
        } catch (error) {
          const message =
            options.onErrorMessage || (error instanceof Error ? error.message : 'AI request failed')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        }
      },
    })
  },
}
