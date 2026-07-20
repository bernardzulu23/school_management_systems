import { z } from 'zod'
import { aiChain } from '@/lib/ai/provider-fallback'
import { createGroqTextEventStream, GROQ_SSE_HEADERS } from '@/lib/ai/groq-client'
import { AI_SSE_HEADERS } from '@/lib/ai/provider-fallback'

export const HeadteacherSummarySchema = z.object({
  summary: z.string().min(1).max(4000),
})

export { GROQ_SSE_HEADERS, AI_SSE_HEADERS }

/**
 * Stream generative chat via existing Groq→Gemini→OpenRouter chain helpers.
 */
export function createChatSseStream(options: {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
  meta?: Record<string, unknown>
  onComplete?: (fullText: string) => Promise<void>
}): ReadableStream<Uint8Array> {
  return createGroqTextEventStream({
    system: options.system,
    prompt: options.prompt,
    maxTokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.4,
    plainText: false,
    meta: options.meta,
    onComplete: async (fullText) => {
      if (options.onComplete) await options.onComplete(fullText)
    },
  })
}

function extractJsonObject(raw: string): unknown {
  const text = String(raw || '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const slice = start >= 0 && end > start ? text.slice(start, end + 1) : text
  return JSON.parse(slice)
}

/**
 * Summarize already-computed numbers. Zod-validate; on failure retry next
 * attempt through the provider chain rather than surfacing a raw error.
 */
export async function summarizeComputedData(params: {
  label: string
  data: Record<string, unknown>
  question: string
}): Promise<{ summary: string; provider: string; model: string }> {
  const basePrompt = `Summarize these verified school analytics numbers in 2-4 short sentences for a headteacher.
Do not invent, estimate, or add numbers that are not in the DATA JSON.
If a value is 0 or missing, say so plainly.

Question: ${params.question}
Metric set: ${params.label}
DATA (JSON):
${JSON.stringify(params.data, null, 2)}

Respond with JSON only: {"summary":"..."}`

  const system =
    'You summarize pre-computed school analytics. Never invent numbers. Output valid JSON only.'

  const attempts = [
    basePrompt,
    `${basePrompt}\n\nPREVIOUS OUTPUT WAS INVALID. Return ONLY {"summary":"..."} with no markdown.`,
  ]

  let lastProvider = 'none'
  let lastModel = 'none'

  for (const prompt of attempts) {
    try {
      const result = await aiChain.generate(prompt, {
        system,
        maxTokens: 400,
        temperature: 0.2,
      })
      lastProvider = result.provider
      lastModel = result.model

      let parsed: unknown
      try {
        parsed = extractJsonObject(result.text)
      } catch {
        continue
      }

      const validated = HeadteacherSummarySchema.safeParse(parsed)
      if (!validated.success) continue

      return {
        summary: validated.data.summary,
        provider: result.provider,
        model: result.model,
      }
    } catch {
      // try next attempt / fall through to deterministic
    }
  }

  // Deterministic fallback — never hallucinate; surface the verified numbers.
  return {
    summary: `${params.label} (verified figures): ${JSON.stringify(params.data)}`,
    provider: lastProvider === 'none' ? 'deterministic' : lastProvider,
    model: lastModel === 'none' ? 'none' : lastModel,
  }
}
