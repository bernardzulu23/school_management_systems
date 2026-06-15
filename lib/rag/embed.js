import { buildEmbedProviderChain, getConfiguredEmbedProviders } from '@/lib/rag/embedProviders'

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`
const HF_BATCH_SIZE = 16
const VOYAGE_BATCH_SIZE = Math.max(
  1,
  Math.min(128, Number(process.env.VOYAGE_EMBED_BATCH_SIZE) || 8)
)
const VOYAGE_BATCH_DELAY_MS = Math.max(0, Number(process.env.VOYAGE_EMBED_BATCH_DELAY_MS) || 0)
const VOYAGE_RATE_LIMIT_SLEEP_MS = Math.max(
  5000,
  Number(process.env.VOYAGE_RATE_LIMIT_SLEEP_MS) || 20000
)
const VOYAGE_MAX_RETRIES = Math.max(1, Number(process.env.VOYAGE_EMBED_MAX_RETRIES) || 3)
const EMBEDDING_DIM = 384
const VOYAGE_MODEL = String(process.env.VOYAGE_EMBED_MODEL || 'voyage-3-lite').trim()
const OPENROUTER_EMBED_MODEL = String(
  process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small'
).trim()
const GEMINI_EMBED_MODEL = 'text-embedding-004'
const JINA_EMBED_MODEL = String(process.env.JINA_EMBED_MODEL || 'jina-embeddings-v3').trim()

/**
 * @param {unknown} payload
 * @returns {number[][]}
 */
function normalizeEmbeddingResponse(payload) {
  if (!payload) return []
  if (Array.isArray(payload) && payload.length > 0) {
    if (typeof payload[0] === 'number') return [payload]
    if (Array.isArray(payload[0])) {
      if (typeof payload[0][0] === 'number') return payload
      if (Array.isArray(payload[0][0])) {
        return payload.map((row) => meanPoolTokenEmbeddings(row))
      }
    }
  }
  throw new Error('Unexpected embedding response shape from provider')
}

/**
 * Mean-pool token vectors (HF feature-extraction returns per-token vectors for some models).
 * @param {number[][]} tokenVectors
 * @returns {number[]}
 */
function meanPoolTokenEmbeddings(tokenVectors) {
  if (!tokenVectors?.length) return []
  if (typeof tokenVectors[0] === 'number') return tokenVectors
  const dim = tokenVectors[0].length
  const out = new Array(dim).fill(0)
  for (const vec of tokenVectors) {
    for (let i = 0; i < dim; i++) out[i] += vec[i]
  }
  for (let i = 0; i < dim; i++) out[i] /= tokenVectors.length
  return out
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function voyageErrorMessage(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || d?.message || String(d)).join('; ')
  }
  return body?.message || body?.error || `Voyage embedding failed (${status})`
}

function apiErrorMessage(body, fallback) {
  if (typeof body?.error === 'string') return body.error
  if (typeof body?.error?.message === 'string') return body.error.message
  return body?.message || fallback
}

/**
 * @param {number[][]} vectors
 * @param {number} expectedCount
 */
function assertEmbeddingBatch(vectors, expectedCount) {
  if (vectors.length !== expectedCount) {
    throw new Error(`Embedding count mismatch: expected ${expectedCount}, got ${vectors.length}`)
  }
  for (const vec of vectors) {
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
      throw new Error(
        `Expected ${EMBEDDING_DIM}-dim embedding, got ${Array.isArray(vec) ? vec.length : 0}`
      )
    }
  }
}

export function isRetryableEmbeddingError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes(' rpm') ||
    msg.includes('tpm') ||
    msg.includes('payment method') ||
    msg.includes('billing page') ||
    msg.includes('too many requests')
  )
}

export function isProviderFallbackEligible(err) {
  if (isRetryableEmbeddingError(err)) return true
  const msg = String(err?.message || err || '').toLowerCase()
  if (msg.includes('_api_key is required') || msg.includes('_api_key not set')) return false
  return true
}

/**
 * @param {number[]} vec
 * @returns {string}
 */
export function vectorLiteral(vec) {
  const parts = vec.map((n) => {
    const v = Number(n)
    if (!Number.isFinite(v)) throw new Error('Invalid embedding value')
    return v
  })
  if (parts.length !== EMBEDDING_DIM) {
    throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${parts.length}`)
  }
  return `[${parts.join(',')}]`
}

/**
 * @param {string} provider
 * @param {string[]} texts
 * @param {'query' | 'passage'} task
 * @returns {Promise<number[][]>}
 */
async function embedWithProvider(provider, texts, task) {
  if (provider === 'voyage') return embedWithVoyage(texts)
  if (provider === 'openai') return embedWithOpenAI(texts)
  if (provider === 'openrouter') return embedWithOpenRouter(texts)
  if (provider === 'jina') return embedWithJina(texts, task)
  if (provider === 'gemini') return embedWithGemini(texts, task)
  return embedWithHuggingFace(texts)
}

/**
 * @param {string[]} texts
 * @param {{ provider?: string, fallbackProviders?: string[], task?: 'query' | 'passage' }} [options]
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts, options = {}) {
  const inputs = texts.map((t) => String(t || '').trim()).filter(Boolean)
  if (!inputs.length) return []

  const task = options.task === 'query' ? 'query' : 'passage'
  const chain = buildEmbedProviderChain(options.provider, options.fallbackProviders)

  if (!chain.length) {
    throw new Error(
      'No embedding provider is configured. Set GEMINI_API_KEY, JINA_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, VOYAGE_API_KEY, or HUGGINGFACE_API_KEY.'
    )
  }

  let lastError = null

  for (const provider of chain) {
    try {
      return await embedWithProvider(provider, inputs, task)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (!isProviderFallbackEligible(lastError)) throw lastError
    }
  }

  throw lastError || new Error('All embedding providers failed')
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedWithHuggingFace(texts) {
  const key = String(process.env.HUGGINGFACE_API_KEY || '').trim()
  if (!key) {
    throw new Error('HUGGINGFACE_API_KEY is required for RAG embeddings')
  }

  const all = []
  for (let i = 0; i < texts.length; i += HF_BATCH_SIZE) {
    const batch = texts.slice(i, i + HF_BATCH_SIZE)
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: batch }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(apiErrorMessage(body, `HuggingFace embedding failed (${res.status})`))
    }

    const vectors = normalizeEmbeddingResponse(body)
    assertEmbeddingBatch(vectors, batch.length)
    all.push(...vectors)
  }
  return all
}

/**
 * @param {string[]} texts
 * @param {'query' | 'passage'} task
 * @returns {Promise<number[][]>}
 */
async function embedWithJina(texts, task) {
  const key = String(process.env.JINA_API_KEY || '').trim()
  if (!key) {
    throw new Error('JINA_API_KEY is required for jina embeddings')
  }

  const jinaTask = task === 'query' ? 'retrieval.query' : 'retrieval.passage'
  const all = []

  for (let i = 0; i < texts.length; i += HF_BATCH_SIZE) {
    const batch = texts.slice(i, i + HF_BATCH_SIZE)
    const res = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: JINA_EMBED_MODEL,
        input: batch,
        task: jinaTask,
        dimensions: EMBEDDING_DIM,
      }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(apiErrorMessage(body, `Jina embedding failed (${res.status})`))
    }

    const data = body?.data || []
    const vectors = data.sort((a, b) => a.index - b.index).map((row) => row.embedding)
    assertEmbeddingBatch(vectors, batch.length)
    all.push(...vectors)
  }

  return all
}

/**
 * @param {string[]} texts
 * @param {'query' | 'passage'} task
 * @returns {Promise<number[][]>}
 */
async function embedWithGemini(texts, task) {
  const key = String(process.env.GEMINI_API_KEY || '').trim()
  if (!key) {
    throw new Error('GEMINI_API_KEY is required for gemini embeddings')
  }

  const taskType = task === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'
  const all = []

  for (let i = 0; i < texts.length; i += HF_BATCH_SIZE) {
    const batch = texts.slice(i, i + HF_BATCH_SIZE)
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:batchEmbedContents?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${GEMINI_EMBED_MODEL}`,
            content: { parts: [{ text }] },
            taskType,
            outputDimensionality: EMBEDDING_DIM,
          })),
        }),
      }
    )

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(apiErrorMessage(body, `Gemini embedding failed (${res.status})`))
    }

    const embeddings = body?.embeddings || []
    const vectors = embeddings.map((row) => row?.values).filter(Array.isArray)
    assertEmbeddingBatch(vectors, batch.length)
    all.push(...vectors)
  }

  return all
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedWithOpenRouter(texts) {
  const key = String(process.env.OPENROUTER_API_KEY || '').trim()
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is required for openrouter embeddings')
  }

  const all = []
  for (let i = 0; i < texts.length; i += HF_BATCH_SIZE) {
    const batch = texts.slice(i, i + HF_BATCH_SIZE)
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://zambia-schools.example',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Zambian School Management System',
      },
      body: JSON.stringify({
        model: OPENROUTER_EMBED_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIM,
      }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(apiErrorMessage(body, `OpenRouter embedding failed (${res.status})`))
    }

    const data = body?.data || []
    const vectors = data.sort((a, b) => a.index - b.index).map((row) => row.embedding)
    assertEmbeddingBatch(vectors, batch.length)
    all.push(...vectors)
  }

  return all
}

/**
 * Voyage supports array input — batch chunks per request with 429 retry + optional inter-batch delay.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedWithVoyage(texts) {
  const key = String(process.env.VOYAGE_API_KEY || '').trim()
  if (!key) {
    throw new Error('VOYAGE_API_KEY is required for voyage embeddings')
  }

  const all = []

  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_SIZE) {
    const batch = texts.slice(i, i + VOYAGE_BATCH_SIZE)
    let batchVectors = null
    let lastError = null

    for (let attempt = 0; attempt < VOYAGE_MAX_RETRIES; attempt++) {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input: batch,
          output_dimension: EMBEDDING_DIM,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (res.status === 429 || isRetryableEmbeddingError(voyageErrorMessage(body, res.status))) {
        lastError = new Error(voyageErrorMessage(body, res.status))
        if (attempt + 1 < VOYAGE_MAX_RETRIES) {
          await sleep(VOYAGE_RATE_LIMIT_SLEEP_MS)
          continue
        }
        throw lastError
      }

      if (!res.ok) {
        throw new Error(voyageErrorMessage(body, res.status))
      }

      const data = body?.data || []
      batchVectors = data.sort((a, b) => a.index - b.index).map((row) => row.embedding)
      assertEmbeddingBatch(batchVectors, batch.length)
      break
    }

    if (!batchVectors) {
      throw lastError || new Error('Voyage embedding failed after retries')
    }

    all.push(...batchVectors)

    const hasMore = i + VOYAGE_BATCH_SIZE < texts.length
    if (hasMore && VOYAGE_BATCH_DELAY_MS > 0) {
      await sleep(VOYAGE_BATCH_DELAY_MS)
    }
  }

  return all
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedWithOpenAI(texts) {
  const key = String(process.env.OPENAI_API_KEY || '').trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is required for openai embeddings')
  }

  const all = []
  for (let i = 0; i < texts.length; i += HF_BATCH_SIZE) {
    const batch = texts.slice(i, i + HF_BATCH_SIZE)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: batch,
        dimensions: EMBEDDING_DIM,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(apiErrorMessage(body, `OpenAI embedding failed (${res.status})`))
    }
    const data = body?.data || []
    const vectors = data.sort((a, b) => a.index - b.index).map((row) => row.embedding)
    assertEmbeddingBatch(vectors, batch.length)
    all.push(...vectors)
  }
  return all
}

export {
  EMBEDDING_DIM,
  HF_MODEL,
  VOYAGE_BATCH_SIZE,
  VOYAGE_RATE_LIMIT_SLEEP_MS,
  getConfiguredEmbedProviders,
  embedWithVoyage,
}
