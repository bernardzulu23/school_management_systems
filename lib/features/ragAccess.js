/**
 * RAG feature flags by school plan (free vs paid embedding/retrieval).
 * @param {{ plan?: string | null }} school
 */
export function canUseRAG(school) {
  const plan = String(school?.plan || 'trial').toLowerCase()

  if (plan === 'basic' || plan === 'trial' || plan === 'free') {
    return {
      enabled: true,
      topK: 5,
      embedProvider: 'huggingface',
      reranking: false,
    }
  }

  if (plan === 'standard' || plan === 'premium' || plan === 'enterprise') {
    return {
      enabled: true,
      topK: 15,
      embedProvider: process.env.VOYAGE_API_KEY ? 'voyage' : 'openai',
      reranking: true,
    }
  }

  return {
    enabled: true,
    topK: 5,
    embedProvider: 'huggingface',
    reranking: false,
  }
}
