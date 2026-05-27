import { canUseRAG } from '@/lib/features/ragAccess'
import { retrieveContext } from '@/lib/rag/retrieve'
import { logger } from '@/lib/utils/logger'

/**
 * Build prompt block + citation refs from school materials.
 * @param {{
 *   query: string
 *   schoolId: string
 *   schoolPlan?: string | null
 *   subject?: string | null
 * }} params
 */
export async function buildRagContextForQuery({ query, schoolId, schoolPlan, subject }) {
  const access = canUseRAG({ plan: schoolPlan })
  if (!access.enabled) {
    return { block: '', refs: [], enabled: false }
  }

  if (!process.env.HUGGINGFACE_API_KEY && access.embedProvider === 'huggingface') {
    return { block: '', refs: [], enabled: false, skipped: 'no_embedding_key' }
  }

  try {
    const chunks = await retrieveContext(query, schoolId, {
      schoolPlan,
      subject,
      topK: access.topK,
    })

    if (!chunks?.length) {
      return { block: '', refs: [], enabled: true }
    }

    const refs = chunks.map((c, i) => ({
      ref: i + 1,
      chunkId: c.id,
      materialId: c.materialId,
      materialTitle: c.materialTitle,
      subject: c.materialSubject,
      chunkIndex: c.chunkIndex,
      similarity: Number(c.similarity),
      excerpt: String(c.content || '').slice(0, 280),
    }))

    const block =
      "Use the following excerpts from this school's own uploaded materials as primary reference. " +
      'Cite them as [Ref N] when used.\n\n' +
      chunks
        .map(
          (c, i) =>
            `[Ref ${i + 1}] (${c.materialTitle || 'Material'}${c.materialSubject ? ` — ${c.materialSubject}` : ''}, chunk ${c.chunkIndex}):\n${c.content}`
        )
        .join('\n\n')

    return { block, refs, enabled: true }
  } catch (err) {
    logger.warn('rag.retrieve.failed', {
      schoolId,
      message: err?.message || String(err),
    })
    return { block: '', refs: [], enabled: true, error: err?.message }
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
