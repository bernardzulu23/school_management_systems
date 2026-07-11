/**
 * Multi-provider fallback chain for AI text generation.
 * Order: Groq → Gemini → OpenRouter → OpenAI → HuggingFace
 */
import { generateText } from 'ai'
import { aiHttpFetch, formatNetworkError } from '@/lib/ai/ai-http'
import { geminiGenerateContentUrl, geminiModelCandidates } from '@/lib/ai/gemini-config'
import { groqModelFor, groqModelIdsForChain } from '@/lib/ai/groq-config'
import { logger } from '@/lib/utils/logger'

const log = logger({ route: 'AI:provider-fallback' })

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

export interface AIChainResponse {
  text: string
  provider: string
  model: string
}

interface ProviderConfig {
  name: string
  key: string | undefined
  endpoint: string
  model: string
  isAvailable: boolean
}

function encodeSseEvent(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

function openAiMessages(prompt: string, system?: string, maxTokens = 2000, temperature = 0.7) {
  const messages: Array<{ role: string; content: string }> = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })
  return { messages, max_tokens: maxTokens, temperature }
}

export class AIProviderChain {
  private providers: ProviderConfig[]

  constructor() {
    this.providers = [
      {
        name: 'Groq',
        key: process.env.GROQ_API_KEY,
        endpoint: 'https://api.groq.com/openai/v1',
        model: String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
        isAvailable: Boolean(String(process.env.GROQ_API_KEY || '').trim()),
      },
      {
        name: 'Gemini',
        key: process.env.GEMINI_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim(),
        isAvailable: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      },
      {
        name: 'OpenRouter',
        key: process.env.OPENROUTER_API_KEY,
        endpoint: 'https://openrouter.ai/api/v1',
        model: String(
          process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
        ).trim(),
        isAvailable: Boolean(String(process.env.OPENROUTER_API_KEY || '').trim()),
      },
      {
        name: 'OpenAI',
        key: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        model: String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
        isAvailable: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
      },
      {
        name: 'HuggingFace',
        key: process.env.HUGGINGFACE_API_KEY,
        endpoint: 'https://api-inference.huggingface.co/models',
        model: String(process.env.HUGGINGFACE_CHAT_MODEL || 'meta-llama/Llama-2-7b-chat-hf').trim(),
        isAvailable: Boolean(String(process.env.HUGGINGFACE_API_KEY || '').trim()),
      },
    ]
  }

  isConfigured(): boolean {
    return this.providers.some((p) => p.isAvailable)
  }

  getProviderStatus() {
    return this.providers.map((p) => ({
      name: p.name,
      available: p.isAvailable,
      model: p.model,
    }))
  }

  async generate(prompt: string, options: AIChainGenerateOptions = {}): Promise<AIChainResponse> {
    const availableProviders = this.providers.filter((p) => p.isAvailable)

    if (availableProviders.length === 0) {
      throw new Error(
        'No AI providers configured. Set GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.'
      )
    }

    let lastError: Error | null = null
    const failures: string[] = []

    for (const provider of availableProviders) {
      try {
        log.info('Trying AI provider', { provider: provider.name })
        const response = await this.callProvider(provider, prompt, options)
        log.info('AI provider succeeded', { provider: provider.name, model: response.model })
        return response
      } catch (error) {
        const detail = formatNetworkError(error)
        lastError = new Error(detail)
        failures.push(`${provider.name}: ${detail}`)
        log.warn('AI provider failed', { provider: provider.name, message: detail })
      }
    }

    throw new Error(
      `All AI providers failed (${failures.length}): ${failures.join(' · ') || lastError?.message || 'Unknown error'}`
    )
  }

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
  }

  createTextEventStream(options: AIChainStreamOptions): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        let responseText = ''
        let provider = 'unknown'
        let model = 'unknown'

        try {
          const meta = { ...(options.meta || {}) }
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
            // Full chain failed — try Groq/Gemini streaming before giving up.
          }

          const { streamAITextWithFallback } = await import('@/lib/ai/client')
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

          const finalText = options.plainText ? sanitizePlainText(responseText) : responseText

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
        } catch (error) {
          const message =
            options.onErrorMessage || (error instanceof Error ? error.message : 'AI request failed')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        }
      },
    })
  }

  private async callProvider(
    provider: ProviderConfig,
    prompt: string,
    options: AIChainGenerateOptions
  ): Promise<AIChainResponse> {
    switch (provider.name) {
      case 'Gemini':
        return this.callGemini(prompt, provider, options)
      case 'Groq':
        return this.callGroq(prompt, provider, options)
      case 'OpenRouter':
        return this.callOpenRouter(prompt, provider, options)
      case 'OpenAI':
        return this.callOpenAI(prompt, provider, options)
      case 'HuggingFace':
        return this.callHuggingFace(prompt, provider, options)
      default:
        throw new Error(`Unknown provider: ${provider.name}`)
    }
  }

  private async callGemini(
    prompt: string,
    provider: ProviderConfig,
    options: AIChainGenerateOptions
  ): Promise<AIChainResponse> {
    const key = String(provider.key || '').trim()
    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }
    if (options.system) {
      body.systemInstruction = { parts: [{ text: options.system }] }
    }

    let lastError: Error | null = null
    const models = geminiModelCandidates()

    for (const model of models) {
      try {
        const response = await aiHttpFetch(`${geminiGenerateContentUrl(model)}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const msg = data?.error?.message || JSON.stringify(data)
          throw new Error(`Gemini error ${response.status}: ${msg}`)
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error('Gemini returned an empty response')
        }

        return { text, provider: 'gemini', model }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const retryable =
          lastError.message.includes('404') ||
          lastError.message.includes('not found') ||
          lastError.message.includes('not supported')
        if (!retryable) throw lastError
        log.warn('Gemini model unavailable, trying next', { model, message: lastError.message })
      }
    }

    throw lastError || new Error('Gemini: all model candidates failed')
  }

  private async callGroq(
    prompt: string,
    provider: ProviderConfig,
    options: AIChainGenerateOptions
  ): Promise<AIChainResponse> {
    const models = groqModelIdsForChain(provider.model)
    let lastError: Error | null = null

    for (const modelId of models) {
      try {
        const result = await generateText({
          model: groqModelFor(modelId),
          system: options.system,
          prompt,
          maxOutputTokens: options.maxTokens ?? 2000,
          temperature: options.temperature ?? 0.7,
        })
        const text = String(result.text || '').trim()
        if (!text) throw new Error('Groq returned an empty response')
        return { text, provider: 'groq', model: modelId }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        log.warn('Groq model failed in chain', { model: modelId, message: lastError.message })
      }
    }

    throw lastError || new Error('Groq: all model candidates failed')
  }

  private async callOpenRouter(
    prompt: string,
    provider: ProviderConfig,
    options: AIChainGenerateOptions
  ): Promise<AIChainResponse> {
    const payload = openAiMessages(
      prompt,
      options.system,
      options.maxTokens ?? 2000,
      options.temperature ?? 0.7
    )

    const response = await aiHttpFetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://zambia-schools.example',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Zambian School Management System',
      },
      body: JSON.stringify({ model: provider.model, ...payload }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        `OpenRouter error ${response.status}: ${data?.error?.message || JSON.stringify(data)}`
      )
    }

    const text = data.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('OpenRouter returned an empty response')
    }

    return { text, provider: 'openrouter', model: provider.model }
  }

  private async callOpenAI(
    prompt: string,
    provider: ProviderConfig,
    options: AIChainGenerateOptions
  ): Promise<AIChainResponse> {
    const payload = openAiMessages(
      prompt,
      options.system,
      options.maxTokens ?? 2000,
      options.temperature ?? 0.7
    )

    const response = await aiHttpFetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({ model: provider.model, ...payload }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        `OpenAI error ${response.status}: ${data?.error?.message || JSON.stringify(data)}`
      )
    }

    const text = data.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('OpenAI returned an empty response')
    }

    return { text, provider: 'openai', model: provider.model }
  }

  private async callHuggingFace(
    prompt: string,
    provider: ProviderConfig,
    options: AIChainGenerateOptions
  ): Promise<AIChainResponse> {
    const fullPrompt = options.system ? `${options.system}\n\n${prompt}` : prompt

    const response = await aiHttpFetch(`${provider.endpoint}/${provider.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: options.maxTokens ?? 2000,
          temperature: options.temperature ?? 0.7,
          return_full_text: false,
        },
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errMsg =
        typeof data?.error === 'string' ? data.error : data?.error?.message || JSON.stringify(data)
      throw new Error(`HuggingFace error ${response.status}: ${errMsg}`)
    }

    let text = ''
    if (Array.isArray(data) && data[0]?.generated_text) {
      text = String(data[0].generated_text)
    } else if (typeof data?.generated_text === 'string') {
      text = data.generated_text
    }

    if (!text.trim()) {
      throw new Error('HuggingFace returned an empty response')
    }

    return { text, provider: 'huggingface', model: provider.model }
  }
}

/** Singleton — use `aiChain.generate(prompt, { system })` in API routes. */
export const aiChain = new AIProviderChain()
