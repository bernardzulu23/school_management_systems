import prisma from '@/lib/prisma'
import { embedTexts, vectorLiteral } from '@/lib/rag/embed'
import { canUseRAG } from '@/lib/features/ragAccess'

/**
 * @param {string[]} materialIds
 * @param {string} schoolId
 */
async function validateMaterialIds(materialIds, schoolId) {
  const ids = [...new Set(materialIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return []

  const rows = await prisma.schoolMaterial.findMany({
    where: { schoolId, id: { in: ids } },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

/**
 * Top-K cosine similarity search, always filtered by schoolId first.
 * @param {string} query
 * @param {string} schoolId
 * @param {{
 *   topK?: number
 *   schoolPlan?: string | null
 *   subject?: string | null
 *   materialIds?: string[]
 *   gradeLevel?: string | null
 * }} [options]
 */
export async function retrieveContext(query, schoolId, options = {}) {
  const access = canUseRAG({ plan: options.schoolPlan })
  if (!access.enabled) return []

  const q = String(query || '').trim()
  if (!q || !schoolId) return []

  const topK = options.topK ?? access.topK
  const [queryEmbedding] = await embedTexts([q], { provider: access.embedProvider })
  if (!queryEmbedding?.length) return []

  const vec = vectorLiteral(queryEmbedding)
  const subject = options.subject ? String(options.subject).trim() : null
  const gradeLevel = options.gradeLevel ? String(options.gradeLevel).trim() : null
  const topicHint = q.split(/\s+/).slice(0, 6).join(' ')

  let materialIds = []
  if (Array.isArray(options.materialIds) && options.materialIds.length) {
    materialIds = await validateMaterialIds(options.materialIds, schoolId)
    if (!materialIds.length) return []
  }

  const conditions = ['mc."schoolId" = $2', 'sm."schoolId" = $2']
  const params = [vec, schoolId]
  let paramIndex = 3

  if (materialIds.length) {
    conditions.push(`sm.id = ANY($${paramIndex}::text[])`)
    params.push(materialIds)
    paramIndex += 1
  }

  if (subject) {
    conditions.push(`LOWER(sm.subject) = LOWER($${paramIndex})`)
    params.push(subject)
    paramIndex += 1
  }

  if (gradeLevel) {
    conditions.push(`LOWER(sm."gradeLevel") = LOWER($${paramIndex})`)
    params.push(gradeLevel)
    paramIndex += 1
  }

  const whereClause = conditions.join(' AND ')

  let orderExpr = `(1 - (mc.embedding <=> $1::vector))`
  if (topicHint) {
    const sanitized = topicHint.replace(/[%_\\]/g, '')
    params.push(`%${sanitized}%`)
    orderExpr = `(1 - (mc.embedding <=> $1::vector)) + CASE WHEN sm.title ILIKE $${paramIndex} THEN 0.05 ELSE 0 END`
    paramIndex += 1
  }

  params.push(topK)
  const limitParam = paramIndex

  return prisma.$queryRawUnsafe(
    `SELECT mc.id, mc.content, mc."materialId", mc."chunkIndex",
            sm.title AS "materialTitle", sm.subject AS "materialSubject",
            sm."gradeLevel" AS "materialGradeLevel",
            ${orderExpr} AS similarity
     FROM "MaterialChunk" mc
     INNER JOIN "SchoolMaterial" sm ON sm.id = mc."materialId"
     WHERE ${whereClause}
     ORDER BY similarity DESC
     LIMIT $${limitParam}`,
    ...params
  )
}

/**
 * Map raw chunk rows to citation refs.
 * @param {Array<{ id: string, materialId: string, materialTitle?: string, materialSubject?: string, chunkIndex: number, similarity: number, content?: string }>} chunks
 */
export function chunksToRagRefs(chunks) {
  return (chunks || []).map((c, i) => ({
    ref: i + 1,
    chunkId: c.id,
    materialId: c.materialId,
    materialTitle: c.materialTitle,
    subject: c.materialSubject,
    chunkIndex: c.chunkIndex,
    similarity: Number(c.similarity),
    excerpt: String(c.content || '').slice(0, 280),
  }))
}

/**
 * Build prompt block from chunk rows.
 * @param {Array<{ materialTitle?: string, materialSubject?: string, chunkIndex: number, content?: string }>} chunks
 */
export function chunksToRagBlock(chunks) {
  if (!chunks?.length) return ''
  return (
    "Use the following excerpts from this school's own uploaded materials as primary reference. " +
    'Cite them as [Ref N] when used.\n\n' +
    chunks
      .map(
        (c, i) =>
          `[Ref ${i + 1}] (${c.materialTitle || 'Material'}${c.materialSubject ? ` — ${c.materialSubject}` : ''}, chunk ${c.chunkIndex}):\n${c.content}`
      )
      .join('\n\n')
  )
}
