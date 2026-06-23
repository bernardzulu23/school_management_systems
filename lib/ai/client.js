/**
 * ZSMS AI Client — Groq via Vercel AI SDK (free tier).
 *
 * @see docs/AI_GUIDE.md
 */
import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText, streamText } from 'ai'
import {
  GROQ_FALLBACK_MODELS,
  GROQ_STREAM_MODEL,
  GROQ_STRUCTURED_MODEL,
  groqModelFor,
} from '@/lib/ai/groq-config'
import { env } from '@/lib/config/env'
import { captureError, logger } from '@/lib/utils/logger'

/** Model for streaming / prose (fast, no structured output). */
export const GROQ_STREAM_MODEL_EXPORT = GROQ_STREAM_MODEL

/** Model for structured JSON (json_object mode when structuredOutputs disabled). */
export const GROQ_STRUCTURED_MODEL_EXPORT = GROQ_STRUCTURED_MODEL

/** @deprecated use GROQ_STREAM_MODEL */
export const GROQ_MODEL = GROQ_STREAM_MODEL

export { GROQ_FALLBACK_MODELS, groqModelFor }

export const groqModel = groqModelFor(GROQ_STREAM_MODEL)

const JSON_SYSTEM_SUFFIX =
  '\n\nIMPORTANT: Respond ONLY with valid JSON that matches the requested structure. No markdown, no explanation, just JSON.'

export function assertGroqConfigured() {
  const configured = [
    env.groqApiKey || process.env.GROQ_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.HUGGINGFACE_API_KEY,
  ].some((k) => Boolean(String(k || '').trim()))
  if (!configured) {
    throw new Error(
      'No AI provider configured. Set GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.'
    )
  }
}

/** Full multi-provider chain (Groq → Gemini → OpenRouter → OpenAI → HuggingFace). */
async function generateTextViaProviderChain(system, userPrompt, options = {}) {
  const { aiChain } = await import('@/lib/ai/provider-fallback')
  if (!aiChain.isConfigured()) {
    throw new Error('No AI provider configured')
  }
  const result = await aiChain.generate(String(userPrompt), {
    system: system ? String(system) : undefined,
    maxTokens: options.maxOutputTokens ?? options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.7,
  })
  return {
    text: result.text,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    model: result.model,
    provider: result.provider,
  }
}

function usageFromResult(usage) {
  const input = Number(usage?.inputTokens ?? usage?.promptTokens ?? 0)
  const output = Number(usage?.outputTokens ?? usage?.completionTokens ?? 0)
  return { inputTokens: input, outputTokens: output, totalTokens: input + output }
}

function isRetryableModelError(error) {
  const msg = String(error?.message || error || '').toLowerCase()
  return (
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('model') ||
    msg.includes('json_schema') ||
    msg.includes('structured output') ||
    msg.includes('decommissioned') ||
    msg.includes('not found') ||
    msg.includes('invalid') ||
    msg.includes('timeout') ||
    msg.includes('overloaded') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('econnreset')
  )
}

/**
 * Non-streaming text generation with model fallback.
 */
export async function generateAIText(userPrompt, options = {}) {
  assertGroqConfigured()
  const log = logger({ route: 'AI:generateText' })
  const models = options.models || GROQ_FALLBACK_MODELS
  let lastError
  const hasGroq = Boolean(String(env.groqApiKey || process.env.GROQ_API_KEY || '').trim())

  if (hasGroq) {
    for (const modelId of models) {
      try {
        const result = await generateText({
          model: groqModelFor(modelId),
          system: options.system,
          prompt: userPrompt,
          maxOutputTokens: options.maxOutputTokens ?? options.maxTokens ?? 2000,
          temperature: options.temperature ?? 0.7,
        })
        const usage = usageFromResult(result.usage)
        log.info('AI text generated', { ...usage, model: modelId, provider: 'groq' })
        return { text: result.text, usage, model: modelId, provider: 'groq' }
      } catch (error) {
        lastError = error
        if (!isRetryableModelError(error)) break
        log.warn('AI text fallback', { model: modelId, message: error?.message })
      }
    }
  }

  try {
    const chainResult = await generateTextViaProviderChain(options.system, userPrompt, options)
    log.info('AI text generated via provider chain', {
      model: chainResult.model,
      provider: chainResult.provider,
    })
    return chainResult
  } catch (chainError) {
    lastError = chainError
  }

  captureError(lastError, { route: 'AI:generateText' })
  throw new Error(
    `AI generation failed after all providers. ${lastError?.message || 'Check AI API keys and model env vars.'}`
  )
}

/**
 * Stream text generation — returns the AI SDK streamText result (primary model only).
 */
export async function streamAIText(systemPrompt, userPrompt, options = {}) {
  assertGroqConfigured()
  const log = logger({ route: 'AI:stream' })
  const modelId = options.model || GROQ_STREAM_MODEL
  log.info('Starting AI stream', { promptLength: userPrompt.length, model: modelId })

  return streamText({
    model: groqModelFor(modelId),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: options.maxOutputTokens ?? options.maxTokens ?? 4000,
    temperature: options.temperature ?? 0.7,
    onFinish: ({ usage }) => {
      const u = usageFromResult(usage)
      log.info('AI stream complete', { ...u, model: modelId })
    },
  })
}

/**
 * Stream with automatic fallback models (sequential attempts).
 */
export async function streamAITextWithFallback(systemPrompt, userPrompt, options = {}) {
  assertGroqConfigured()
  const models = options.models || GROQ_FALLBACK_MODELS
  let lastError
  const hasGroq = Boolean(String(env.groqApiKey || process.env.GROQ_API_KEY || '').trim())

  if (hasGroq) {
    for (const modelId of models) {
      try {
        return {
          result: await streamAIText(systemPrompt, userPrompt, { ...options, model: modelId }),
          model: modelId,
          provider: 'groq',
        }
      } catch (error) {
        lastError = error
        if (!isRetryableModelError(error)) break
      }
    }
  }

  try {
    const chainResult = await generateTextViaProviderChain(systemPrompt, userPrompt, options)
    const { text, model, provider } = chainResult
    return {
      result: {
        textStream: (async function* () {
          yield text
        })(),
        usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      },
      model,
      provider,
    }
  } catch (chainError) {
    lastError = chainError
  }

  throw new Error(`AI stream failed after all providers. ${lastError?.message || 'unknown error'}`)
}

/**
 * Generate a Zod-validated structured object.
 * Uses Groq `json_object` mode (structuredOutputs: false) — compatible with free-tier models.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ maxOutputTokens?: number, maxTokens?: number, temperature?: number, maxRetries?: number, models?: string[] }} [options]
 */
export async function generateAIObject(schema, systemPrompt, userPrompt, options = {}) {
  assertGroqConfigured()
  const log = logger({ route: 'AI:generateObject' })
  const models = options.models || GROQ_FALLBACK_MODELS
  const maxRetries = options.maxRetries ?? 2
  let lastError

  const system = String(systemPrompt || '') + JSON_SYSTEM_SUFFIX
  const hasGroq = Boolean(String(env.groqApiKey || process.env.GROQ_API_KEY || '').trim())

  if (hasGroq) {
    for (const modelId of models) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log.info('Generating structured AI object', { attempt, model: modelId, mode: 'json' })
          const result = await generateObject({
            model: groqModelFor(modelId),
            schema,
            mode: 'json',
            providerOptions: {
              groq: { structuredOutputs: false },
            },
            system,
            prompt: userPrompt,
            maxOutputTokens: options.maxOutputTokens ?? options.maxTokens ?? 4000,
            temperature: options.temperature ?? 0.5,
          })
          const usage = usageFromResult(result.usage)
          log.info('AI object generated', { ...usage, model: modelId })
          return { object: result.object, usage, model: modelId }
        } catch (error) {
          lastError = error
          log.warn('AI object generation attempt failed', {
            attempt,
            model: modelId,
            message: error?.message,
          })
          if (!isRetryableModelError(error) && attempt >= maxRetries) break
        }
      }
    }
  }

  try {
    const { extractJSONObject } = await import('@/lib/ai/groq-client')
    const jsonUserPrompt = `${userPrompt}\n\nRespond with ONLY valid JSON matching the requested structure.`
    const chainResult = await generateTextViaProviderChain(system, jsonUserPrompt, options)
    const raw = extractJSONObject(chainResult.text)
    if (raw) {
      const parsed = schema.safeParse(raw)
      if (parsed.success) {
        log.info('AI object generated via provider chain', {
          model: chainResult.model,
          provider: chainResult.provider,
        })
        return {
          object: parsed.data,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          model: chainResult.model,
          provider: chainResult.provider,
        }
      }
      lastError = new Error(`${chainResult.provider} JSON did not match schema`)
    } else {
      lastError = new Error(`${chainResult.provider} returned unparseable JSON`)
    }
  } catch (chainError) {
    lastError = chainError
  }

  captureError(lastError, { route: 'AI:generateObject' })
  throw new Error(
    `AI generation failed: ${lastError?.message || 'unknown error'}. All providers were tried (Groq structured → full chain). Set GROQ_MODEL to llama-3.1-8b-instant if Groq keeps failing.`
  )
}
