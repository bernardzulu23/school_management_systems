import { canUseRAG } from '@/lib/features/ragAccess'
import { hasAnyEmbedProvider } from '@/lib/rag/embedProviders'
import { retrieveContext, chunksToRagRefs, chunksToRagBlock } from '@/lib/rag/retrieve'
import { resolveCurriculumContext, buildCurriculumContextBlock } from '@/lib/ai/curriculum-context'
import { resolveStaticFallback, buildFallbackContextBlock } from '@/lib/ai/fallback-resolver'
import { logger } from '@/lib/utils/logger'

function mergeRagBlocks(...blocks) {
  const parts = blocks.map((b) => String(b || '').trim()).filter(Boolean)
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
  const corpus = await resolveCurriculumContext(subject, gradeLevel)
  const curriculum = corpus
    ? buildCurriculumContextBlock(corpus, query, { limit: topK ?? access.topK ?? 5 })
    : { block: '', refs: [], enabled: false }
  const curriculumMaterialId = curriculum.materialId || curriculum.source

  // Teaching-module static fallback (forms present under data/static-fallback/).
  // Missing form dirs → known-gap telemetry (typically Form 3–4 STEM).
  const tmHit = resolveStaticFallback(subject, gradeLevel, query)
  const tmBlock = buildFallbackContextBlock(tmHit)

  if (!access.enabled) {
    const block = mergeRagBlocks(curriculum.block, tmBlock)
    if (block) {
      return {
        block,
        refs: curriculum.refs,
        enabled: true,
        materialIds: curriculumMaterialId ? [curriculumMaterialId] : [],
        curriculumSource: curriculum.source,
        fallbackTier: tmHit?.tier || null,
      }
    }
    return { block: '', refs: [], enabled: false, materialIds: [] }
  }

  const hasEmbeddingKey = hasAnyEmbedProvider()
  if (!hasEmbeddingKey) {
    const block = mergeRagBlocks(curriculum.block, tmBlock)
    if (block) {
      return {
        block,
        refs: curriculum.refs,
        enabled: true,
        skipped: 'no_embedding_key',
        materialIds: curriculumMaterialId ? [curriculumMaterialId] : [],
        curriculumSource: curriculum.source,
        fallbackTier: tmHit?.tier || null,
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

    const block = mergeRagBlocks(schoolBlock, curriculum.block, tmBlock)
    const refs = mergeRagRefs(schoolRefs, curriculum.refs)

    if (!block) {
      return { block: '', refs: [], enabled: true, materialIds: materialIds || [] }
    }

    if (curriculum.source && curriculumMaterialId) {
      materialsUsed.push(curriculumMaterialId)
    }

    return {
      block,
      refs,
      enabled: true,
      materialIds: materialsUsed.length ? materialsUsed : materialIds || [],
      curriculumSource: curriculum.source || undefined,
      fallbackTier: tmHit?.tier || null,
    }
  } catch (err) {
    logger.warn('rag.retrieve.failed', {
      schoolId,
      message: err?.message || String(err),
    })
    const block = mergeRagBlocks(curriculum.block, tmBlock)
    if (block) {
      return {
        block,
        refs: curriculum.refs,
        enabled: true,
        error: err?.message,
        materialIds: curriculumMaterialId ? [curriculumMaterialId] : [],
        curriculumSource: curriculum.source,
        fallbackTier: tmHit?.tier || null,
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
