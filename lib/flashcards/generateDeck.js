import { generateAIObject, generateAIText } from '@/lib/ai/client'
import { FlashcardDeckSchema } from '@/lib/ai/schemas'
import { extractJSONObject } from '@/lib/ai/groq-client'
import { MAX_CARDS_PER_DECK } from '@/lib/flashcards/limits'

/** Smaller models handle JSON mode more reliably on Groq free tier. */
export const FLASHCARD_AI_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
]

function tokenBudgetForCards(count) {
  const n = Math.max(1, Math.min(MAX_CARDS_PER_DECK, Number(count) || MAX_CARDS_PER_DECK))
  return Math.min(8000, 600 + n * 450)
}

/**
 * Generate an AI flashcard deck with structured output + text/JSON fallback.
 */
export async function generateFlashcardDeck({ system, userPrompt, count }) {
  const maxTokens = tokenBudgetForCards(count)
  const options = {
    models: FLASHCARD_AI_MODELS,
    maxTokens,
    temperature: 0.4,
    maxRetries: 2,
  }

  try {
    const { object } = await generateAIObject(FlashcardDeckSchema, system, userPrompt, options)
    return object
  } catch (objectErr) {
    const jsonPrompt = `${userPrompt}

Respond with ONLY valid JSON (no markdown fences) in this exact shape:
{"title":"deck title","cards":[{"front":"question text","options":["A","B","C","D"],"answer":"A","explanation":"one line"}]}`

    const { text } = await generateAIText(jsonPrompt, {
      system: `${system}\n\nOutput valid JSON only. No prose before or after the JSON object.`,
      models: FLASHCARD_AI_MODELS,
      maxTokens,
      temperature: 0.3,
    })

    const raw = extractJSONObject(text)
    if (!raw) throw objectErr

    const parsed = FlashcardDeckSchema.safeParse(raw)
    if (!parsed.success) throw objectErr
    return parsed.data
  }
}
