import { canUseRAG } from '@/lib/features/ragAccess'
import { hasAnyEmbedProvider } from '@/lib/rag/embedProviders'
import { retrieveContext, chunksToRagRefs, chunksToRagBlock } from '@/lib/rag/retrieve'
import { resolveCurriculumContext, buildCurriculumContextBlock } from '@/lib/ai/curriculum-context'
import { resolveStaticFallback, buildFallbackContextBlock } from '@/lib/ai/fallback-resolver'
import { normalizeForm } from '@/lib/curriculum/chemistry-cdc-2024'
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
 * CDC syllabus grounding is primary; teaching-module static-fallback is optional
 * enrichment. A null TM hit is not a hard failure — generation continues with
 * CDC / school RAG / ungrounded prompt as available.
 * @param {{
 *   query: string
 *   schoolId: string
 *   schoolPlan?: string | null
 *   subject?: string | null
 *   materialIds?: string[]
 *   gradeLevel?: string | null
 *   topic?: string | null
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
  topic,
  topK,
}) {
  const access = canUseRAG({ plan: schoolPlan })
  const corpus = await resolveCurriculumContext(subject, gradeLevel)
  const curriculum = corpus
    ? buildCurriculumContextBlock(corpus, query, { limit: topK ?? access.topK ?? 5 })
    : { block: '', refs: [], enabled: false }
  const curriculumMaterialId = curriculum.materialId || curriculum.source

  // Teaching-module static fallback (forms present under data/static-fallback/).
  // When CDC already grounds Form 3–4, skip the TM probe — those form dirs are
  // usually absent (known-gap), and narrative tools do not need TM lesson plans.
  // Form 1–2 still try TM for activity enrichment alongside CDC.
  const formNum = normalizeForm(gradeLevel)
  const hasCurriculum = Boolean(String(curriculum.block || '').trim())
  const skipTmProbe = hasCurriculum && formNum != null && formNum >= 3
  const tmTopic = topic || query
  const tmHit = skipTmProbe ? null : resolveStaticFallback(subject, gradeLevel, tmTopic)
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
