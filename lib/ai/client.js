/**
 * ZSMS AI Client — Groq via Vercel AI SDK (free tier).
 *
 * @see docs/AI_GUIDE.md
 */
import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText, streamText } from 'ai'
import { env } from '@/lib/config/env'
import { captureError, logger } from '@/lib/utils/logger'

/** Model for streaming / prose (fast, no structured output). */
export const GROQ_STREAM_MODEL = String(env.groqModel || 'llama-3.3-70b-versatile').trim()

/** Model for structured JSON (json_object mode when structuredOutputs disabled). */
export const GROQ_STRUCTURED_MODEL = String(env.groqModel || 'llama-3.3-70b-versatile').trim()

/** @deprecated use GROQ_STREAM_MODEL */
export const GROQ_MODEL = GROQ_STREAM_MODEL

/**
 * Fallback models when primary is rate-limited or unavailable.
 * Keep only currently-supported Groq models — retired models (e.g. gemma2-9b-it)
 * cause the whole request chain to fail.
 */
export const GROQ_FALLBACK_MODELS = [
  GROQ_STRUCTURED_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
].filter((m, i, arr) => arr.indexOf(m) === i)

const JSON_SYSTEM_SUFFIX =
  '\n\nIMPORTANT: Respond ONLY with valid JSON that matches the requested structure. No markdown, no explanation, just JSON.'

const groq = createGroq({ apiKey: env.groqApiKey || process.env.GROQ_API_KEY })

/**
 * @param {string} [modelId]
 * @returns {import('@ai-sdk/provider').LanguageModel}
 */
export function groqModelFor(modelId) {
  return groq(String(modelId || GROQ_STREAM_MODEL).trim())
}

export const groqModel = groqModelFor(GROQ_STREAM_MODEL)

export function assertGroqConfigured() {
  if (!String(env.groqApiKey || process.env.GROQ_API_KEY || '').trim()) {
    throw new Error('Missing GROQ_API_KEY')
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
    msg.includes('overloaded')
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
      log.info('AI text generated', { ...usage, model: modelId })
      return { text: result.text, usage, model: modelId }
    } catch (error) {
      lastError = error
      if (!isRetryableModelError(error)) throw error
      log.warn('AI text fallback', { model: modelId, message: error?.message })
    }
  }

  captureError(lastError, { route: 'AI:generateText' })
  throw new Error(
    `AI generation failed after trying ${models.length} model(s). ${lastError?.message || 'Check GROQ_API_KEY and GROQ_MODEL.'}`
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

  for (const modelId of models) {
    try {
      return {
        result: await streamAIText(systemPrompt, userPrompt, { ...options, model: modelId }),
        model: modelId,
      }
    } catch (error) {
      lastError = error
      if (!isRetryableModelError(error)) throw error
    }
  }

  throw new Error(
    `AI stream failed after trying ${models.length} model(s). ${lastError?.message || 'unknown error'}`
  )
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

  captureError(lastError, { route: 'AI:generateObject' })
  throw new Error(
    `AI generation failed: ${lastError?.message || 'unknown error'}. Try again or set GROQ_MODEL to llama-3.1-8b-instant.`
  )
}
