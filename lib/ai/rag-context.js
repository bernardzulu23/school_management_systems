import { canUseRAG } from '@/lib/features/ragAccess'
import { hasAnyEmbedProvider } from '@/lib/rag/embedProviders'
import { retrieveContext, chunksToRagRefs, chunksToRagBlock } from '@/lib/rag/retrieve'
import { logger } from '@/lib/utils/logger'

/**
 * Build prompt block + citation refs from school materials.
 * @param {{
 *   query: string
 *   schoolId: string
 *   schoolPlan?: string | null
 *   subject?: string | null
 *   materialIds?: string[]
 *   gradeLevel?: string | null
 *   topK?: number
 * }} params
 */
export async function buildRagContextForQuery({
  query,
  schoolId,
  schoolPlan,
  subject,
  materialIds,
  gradeLevel,
  topK,
}) {
  const access = canUseRAG({ plan: schoolPlan })
  if (!access.enabled) {
    return { block: '', refs: [], enabled: false, materialIds: [] }
  }

  const hasEmbeddingKey = hasAnyEmbedProvider()
  if (!hasEmbeddingKey) {
    return { block: '', refs: [], enabled: false, skipped: 'no_embedding_key', materialIds: [] }
  }

  try {
    const chunks = await retrieveContext(query, schoolId, {
      schoolPlan,
      subject,
      materialIds,
      gradeLevel,
      topK: topK ?? access.topK,
    })

    if (!chunks?.length) {
      return { block: '', refs: [], enabled: true, materialIds: materialIds || [] }
    }

    const refs = chunksToRagRefs(chunks)
    const block = chunksToRagBlock(chunks)
    const materialsUsed = [...new Set(chunks.map((c) => c.materialId).filter(Boolean))]

    return { block, refs, enabled: true, materialIds: materialsUsed }
  } catch (err) {
    logger.warn('rag.retrieve.failed', {
      schoolId,
      message: err?.message || String(err),
    })
    return { block: '', refs: [], enabled: true, error: err?.message, materialIds: [] }
  }
}

/**
 * @param {string} systemPrompt
 * @param {string} ragBlock
 */
export function appendRagToSystemPrompt(systemPrompt, ragBlock) {
  const base = String(systemPrompt || '').trim()
  const extra = String(ragBlock || '').trim()
  if (!extra) return base
  return `${base}\n\n${extra}`
}
