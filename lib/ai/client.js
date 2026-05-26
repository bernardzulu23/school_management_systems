/**
 * ZSMS AI Client — Groq via Vercel AI SDK (free tier).
 *
 * @see docs/AI_GUIDE.md
 */
import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText, streamText } from 'ai'
import { env } from '@/lib/config/env'
import { captureError, logger } from '@/lib/utils/logger'

/** Best free Groq model — override with GROQ_MODEL in .env */
export const GROQ_MODEL = String(env.groqModel || 'llama-3.3-70b-versatile').trim()

const groq = createGroq({ apiKey: env.groqApiKey || process.env.GROQ_API_KEY })

export const groqModel = groq(GROQ_MODEL)

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

/**
 * Non-streaming text generation (replaces raw Groq SDK chat completion).
 */
export async function generateAIText(userPrompt, options = {}) {
  assertGroqConfigured()
  const log = logger({ route: 'AI:generateText' })
  const result = await generateText({
    model: groqModel,
    system: options.system,
    prompt: userPrompt,
    maxOutputTokens: options.maxOutputTokens ?? options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.7,
  })
  const usage = usageFromResult(result.usage)
  log.info('AI text generated', usage)
  return { text: result.text, usage, model: GROQ_MODEL }
}

/**
 * Stream text generation — returns the AI SDK streamText result.
 */
export async function streamAIText(systemPrompt, userPrompt, options = {}) {
  assertGroqConfigured()
  const log = logger({ route: 'AI:stream' })
  log.info('Starting AI stream', { promptLength: userPrompt.length })

  return streamText({
    model: groqModel,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: options.maxOutputTokens ?? options.maxTokens ?? 4000,
    temperature: options.temperature ?? 0.7,
    onFinish: ({ usage }) => {
      const u = usageFromResult(usage)
      log.info('AI stream complete', u)
    },
  })
}

/**
 * Generate a Zod-validated structured object (retries on validation failure).
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ maxOutputTokens?: number, temperature?: number, maxRetries?: number }} [options]
 */
export async function generateAIObject(schema, systemPrompt, userPrompt, options = {}) {
  assertGroqConfigured()
  const log = logger({ route: 'AI:generateObject' })
  const maxRetries = options.maxRetries ?? 3
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.info('Generating structured AI object', { attempt })
      const result = await generateObject({
        model: groqModel,
        schema,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: options.maxOutputTokens ?? options.maxTokens ?? 4000,
        temperature: options.temperature ?? 0.5,
      })
      const usage = usageFromResult(result.usage)
      log.info('AI object generated', usage)
      return { object: result.object, usage, model: GROQ_MODEL }
    } catch (error) {
      lastError = error
      log.warn('AI object generation attempt failed', {
        attempt,
        message: error?.message,
      })
    }
  }

  captureError(lastError, { route: 'AI:generateObject' })
  throw new Error(`AI generation failed: ${lastError?.message || 'unknown error'}`)
}
