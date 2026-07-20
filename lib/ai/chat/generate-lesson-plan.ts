/**
 * Force Zod-validated lesson-plan JSON via Groq → Gemini → OpenRouter.
 * On schema validation failure, retry the next provider before erroring to the teacher.
 */
import { aiChain } from '@/lib/ai/provider-fallback'
import { ChatLessonPlanSchema, type ChatLessonPlan } from '@/lib/ai/chat/lesson-plan-schema'
import { buildStructuredLessonPlanPrompt } from '@/lib/ai/structured-lesson-plan'
import { logger } from '@/lib/utils/logger'

const log = logger({ route: 'AI:chat-lesson-plan' })

const SYSTEM = `You are an expert Zambian CBC curriculum lesson planner aligned with the 2023 ZECF.
Create practical, culturally relevant lesson plans for Zambian classrooms.
Respond with ONLY valid JSON matching the requested schema. No markdown fences.
Optional field "mermaidDiagram": Mermaid flowchart/diagram syntax for ICT or science topics; omit or null if not useful.`

function extractJsonObject(raw: string): unknown {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1].trim() : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  const slice = start >= 0 && end > start ? body.slice(start, end + 1) : body
  return JSON.parse(slice)
}

export type GenerateChatLessonPlanInput = {
  subject: string
  form: string
  topic: string
  subTopic?: string
  duration?: number
  term?: string
  ragBlock?: string
  chatContext?: string
}

export type GenerateChatLessonPlanResult = {
  plan: ChatLessonPlan
  provider: string
  model: string
}

/**
 * Walk Groq → Gemini → OpenRouter (and remaining configured chain) until Zod passes.
 */
export async function generateChatLessonPlanJson(
  input: GenerateChatLessonPlanInput
): Promise<GenerateChatLessonPlanResult> {
  const basePrompt = buildStructuredLessonPlanPrompt(
    {
      subject: input.subject,
      form: input.form,
      topic: input.topic,
      subTopic: input.subTopic,
      duration: input.duration,
      term: input.term,
    },
    input.ragBlock || ''
  )

  const chatBit = String(input.chatContext || '').trim()
  const schemaHint = `
Also include optional "topic" and "subTopic" strings, and optional "mermaidDiagram"
(Mermaid syntax string) when a diagram helps ICT/science lessons. Omit mermaidDiagram otherwise.

Respond with a single JSON object only.`

  const prompts = [
    `${basePrompt}${chatBit ? `\n\nTeacher chat context:\n${chatBit.slice(0, 2000)}` : ''}${schemaHint}`,
    `${basePrompt}${schemaHint}\n\nPREVIOUS OUTPUT WAS INVALID JSON OR FAILED SCHEMA VALIDATION. Return ONLY a JSON object with all required fields.`,
  ]

  let lastError: Error | null = null

  for (let attempt = 0; attempt < prompts.length; attempt++) {
    try {
      // aiChain.generate already walks Groq→Gemini→OpenRouter on provider errors.
      // We additionally treat Zod failures as soft failures and re-prompt / continue.
      const result = await generateUntilValid(prompts[attempt]!)
      if (result) return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      log.warn('Chat lesson-plan generation attempt failed', {
        attempt,
        message: lastError.message,
      })
    }
  }

  throw new Error(
    lastError?.message ||
      'Could not generate a valid structured lesson plan. Please try again with a clearer topic.'
  )
}

/**
 * Call each available provider in order; on Zod miss, skip to the next provider
 * (do not silently accept malformed JSON from the fast tier).
 */
async function generateUntilValid(prompt: string): Promise<GenerateChatLessonPlanResult | null> {
  const status = aiChain.getProviderStatus()
  const available = status.filter((p) => p.available).map((p) => p.name)
  // Prefer the locked Phase 3 order: Groq → Gemini → OpenRouter, then any others.
  const preferred = ['Groq', 'Gemini', 'OpenRouter']
  const ordered = [
    ...preferred.filter((n) => available.includes(n)),
    ...available.filter((n) => !preferred.includes(n)),
  ]

  if (ordered.length === 0) {
    throw new Error(
      'No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.'
    )
  }

  let lastZodIssues: string | null = null

  for (const providerName of ordered) {
    try {
      const result = await aiChain.generateForProvider(providerName, prompt, {
        system: SYSTEM,
        maxTokens: 6000,
        temperature: 0.55,
      })

      let parsed: unknown
      try {
        parsed = extractJsonObject(result.text)
      } catch (err) {
        log.warn('Provider returned non-JSON for lesson plan', {
          provider: result.provider,
          message: err instanceof Error ? err.message : String(err),
        })
        continue
      }

      const validated = ChatLessonPlanSchema.safeParse(parsed)
      if (!validated.success) {
        lastZodIssues = validated.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')
        log.warn('Lesson plan Zod validation failed — trying next provider', {
          provider: result.provider,
          issues: lastZodIssues,
        })
        continue
      }

      return {
        plan: validated.data,
        provider: result.provider,
        model: result.model,
      }
    } catch (err) {
      log.warn('Provider call failed for lesson plan', {
        provider: providerName,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (lastZodIssues) {
    throw new Error(`Lesson plan JSON failed validation after all providers: ${lastZodIssues}`)
  }
  return null
}
