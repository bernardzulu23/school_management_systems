const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`
const BATCH_SIZE = 16
const EMBEDDING_DIM = 384

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
 * @param {string[]} texts
 * @param {{ provider?: string }} [options]
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts, options = {}) {
  const inputs = texts.map((t) => String(t || '').trim()).filter(Boolean)
  if (!inputs.length) return []

  const provider = options.provider || 'huggingface'
  if (provider === 'voyage' && process.env.VOYAGE_API_KEY) {
    return embedWithVoyage(inputs)
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return embedWithOpenAI(inputs)
  }
  return embedWithHuggingFace(inputs)
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
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
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
      const errMsg =
        typeof body?.error === 'string'
          ? body.error
          : body?.error?.message || `HuggingFace embedding failed (${res.status})`
      throw new Error(errMsg)
    }

    const vectors = normalizeEmbeddingResponse(body)
    if (vectors.length !== batch.length) {
      throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${vectors.length}`)
    }
    all.push(...vectors)
  }
  return all
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedWithVoyage(texts) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'voyage-3-lite',
      input: texts,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.detail || body?.message || `Voyage embedding failed (${res.status})`)
  }
  const data = body?.data || []
  return data.sort((a, b) => a.index - b.index).map((row) => row.embedding)
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedWithOpenAI(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: EMBEDDING_DIM,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.error?.message || `OpenAI embedding failed (${res.status})`)
  }
  const data = body?.data || []
  return data.sort((a, b) => a.index - b.index).map((row) => row.embedding)
}

export { EMBEDDING_DIM, HF_MODEL }
