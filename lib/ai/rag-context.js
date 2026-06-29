import { canUseRAG } from '@/lib/features/ragAccess'
import { hasAnyEmbedProvider } from '@/lib/rag/embedProviders'
import { retrieveContext, chunksToRagRefs, chunksToRagBlock } from '@/lib/rag/retrieve'
import { buildChemistryCurriculumContext } from '@/lib/curriculum/chemistry-cdc-2024'
import { logger } from '@/lib/utils/logger'

function mergeRagBlocks(schoolBlock, curriculumBlock) {
  const parts = [schoolBlock, curriculumBlock].map((b) => String(b || '').trim()).filter(Boolean)
  return parts.join('\n\n')
}

function mergeRagRefs(schoolRefs, curriculumRefs) {
  const school = schoolRefs || []
  const curriculum = (curriculumRefs || []).map((ref, i) => ({
    ...ref,
    ref: school.length + i + 1,
  }))
  return [...school, ...curriculum]
}

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
  const curriculum = buildChemistryCurriculumContext({
    subject,
    gradeLevel,
    query,
    limit: topK ?? access.topK ?? 5,
  })

  if (!access.enabled) {
    if (curriculum.block) {
      return {
        block: curriculum.block,
        refs: curriculum.refs,
        enabled: true,
        materialIds: ['cdc-chemistry-2024'],
        curriculumSource: curriculum.source,
      }
    }
    return { block: '', refs: [], enabled: false, materialIds: [] }
  }

  const hasEmbeddingKey = hasAnyEmbedProvider()
  if (!hasEmbeddingKey) {
    if (curriculum.block) {
      return {
        block: curriculum.block,
        refs: curriculum.refs,
        enabled: true,
        skipped: 'no_embedding_key',
        materialIds: ['cdc-chemistry-2024'],
        curriculumSource: curriculum.source,
      }
    }
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

    const schoolRefs = chunks?.length ? chunksToRagRefs(chunks) : []
    const schoolBlock = chunks?.length ? chunksToRagBlock(chunks) : ''
    const materialsUsed = [...new Set((chunks || []).map((c) => c.materialId).filter(Boolean))]

    const block = mergeRagBlocks(schoolBlock, curriculum.block)
    const refs = mergeRagRefs(schoolRefs, curriculum.refs)

    if (!block) {
      return { block: '', refs: [], enabled: true, materialIds: materialIds || [] }
    }

    if (curriculum.source) {
      materialsUsed.push('cdc-chemistry-2024')
    }

    return {
      block,
      refs,
      enabled: true,
      materialIds: materialsUsed.length ? materialsUsed : materialIds || [],
      curriculumSource: curriculum.source || undefined,
    }
  } catch (err) {
    logger.warn('rag.retrieve.failed', {
      schoolId,
      message: err?.message || String(err),
    })
    if (curriculum.block) {
      return {
        block: curriculum.block,
        refs: curriculum.refs,
        enabled: true,
        error: err?.message,
        materialIds: ['cdc-chemistry-2024'],
        curriculumSource: curriculum.source,
      }
    }
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
