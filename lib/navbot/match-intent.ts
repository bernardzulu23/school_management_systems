import intents from '@/data/navbot/intents.json'
import { normalizeForSimilarity, similarity, tokenizeForSimilarity } from '@/lib/text/similarity'

export const NAVBOT_MATCH_THRESHOLD = 0.8

export type NavBotIntent = {
  id: string
  triggers: string[]
  answer: string
  route: string
}

export type NavBotIntentMatch = {
  intent: NavBotIntent
  score: number
  trigger: string
  normalizedQuestion: string
  normalizedTrigger: string
}

export type NavBotMatchResult = {
  match: NavBotIntentMatch | null
  fallbackReason: 'empty-question' | 'below-threshold'
  bestCandidate: NavBotIntentMatch | null
}

export const navBotIntents = intents as NavBotIntent[]

export function normalizeNavBotText(value: string): string {
  return normalizeForSimilarity(value)
}

function tokenOverlapScore(a: string, b: string): number {
  const tokensA = tokenizeForSimilarity(a, 2)
  const tokensB = tokenizeForSimilarity(b, 2)
  if (!tokensA.size || !tokensB.size) return 0

  let intersection = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1
  }

  return intersection / Math.max(tokensA.size, tokensB.size)
}

function scoreTrigger(question: string, trigger: string): number {
  const normalizedQuestion = normalizeNavBotText(question)
  const normalizedTrigger = normalizeNavBotText(trigger)

  if (!normalizedQuestion || !normalizedTrigger) return 0
  if (normalizedQuestion === normalizedTrigger) return 1
  if (
    normalizedQuestion.includes(normalizedTrigger) ||
    normalizedTrigger.includes(normalizedQuestion)
  ) {
    return 0.92
  }

  const overlap = tokenOverlapScore(normalizedQuestion, normalizedTrigger)
  const baseSimilarity = similarity(normalizedQuestion, normalizedTrigger, 2)
  return Math.max(overlap, baseSimilarity)
}

export function matchIntent(question: string): NavBotMatchResult {
  const normalizedQuestion = normalizeNavBotText(question)
  if (!normalizedQuestion) {
    return { match: null, fallbackReason: 'empty-question', bestCandidate: null }
  }

  let bestCandidate: NavBotIntentMatch | null = null

  for (const intent of navBotIntents) {
    for (const trigger of intent.triggers) {
      const score = scoreTrigger(normalizedQuestion, trigger)
      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          intent,
          score,
          trigger,
          normalizedQuestion,
          normalizedTrigger: normalizeNavBotText(trigger),
        }
      }
    }
  }

  if (bestCandidate && bestCandidate.score >= NAVBOT_MATCH_THRESHOLD) {
    return { match: bestCandidate, fallbackReason: 'below-threshold', bestCandidate }
  }

  return { match: null, fallbackReason: 'below-threshold', bestCandidate }
}
