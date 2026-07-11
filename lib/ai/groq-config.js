/**
 * Groq model helpers — shared by client.js and provider-fallback (no circular imports).
 */
import { createGroq } from '@ai-sdk/groq'
import { aiHttpFetch } from '@/lib/ai/ai-http'
import { env } from '@/lib/config/env'

/** Default / general Groq model. */
export const GROQ_MODEL = String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim()

/** Streaming / fast prose (override with GROQ_FAST_MODEL). */
export const GROQ_STREAM_MODEL = String(
  process.env.GROQ_FAST_MODEL || 'llama-3.3-70b-versatile'
).trim()

/** Structured JSON / generateObject (override with GROQ_STRUCTURED_MODEL). */
export const GROQ_STRUCTURED_MODEL = String(
  process.env.GROQ_STRUCTURED_MODEL || 'llama-3.1-8b-instant'
).trim()

export const GROQ_FALLBACK_MODELS = [
  GROQ_STRUCTURED_MODEL,
  GROQ_MODEL,
  GROQ_STREAM_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
].filter((m, i, arr) => arr.indexOf(m) === i)

function groqApiKey() {
  return String(env.groqApiKey || process.env.GROQ_API_KEY || '').trim()
}

/** @type {ReturnType<typeof createGroq> | null} */
let groqClient = null

function getGroq() {
  const key = groqApiKey()
  if (!key) throw new Error('GROQ_API_KEY not set')
  if (!groqClient) {
    groqClient = createGroq({
      apiKey: key,
      // Retries + Connection: close — reduces Vercel Undici connect timeouts
      fetch: (url, init) => aiHttpFetch(String(url), init || {}),
    })
  }
  return groqClient
}

/** @param {string} [modelId] */
export function groqModelFor(modelId) {
  return getGroq()(String(modelId || GROQ_STREAM_MODEL).trim())
}

/** @param {string} [primary] @returns {string[]} */
export function groqModelIdsForChain(primary) {
  const head = String(primary || GROQ_MODEL).trim()
  return [...new Set([head, ...GROQ_FALLBACK_MODELS].filter(Boolean))]
}
