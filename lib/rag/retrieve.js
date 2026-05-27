import prisma from '@/lib/prisma'
import { embedTexts, vectorLiteral } from '@/lib/rag/embed'
import { canUseRAG } from '@/lib/features/ragAccess'

/**
 * Top-K cosine similarity search, always filtered by schoolId first.
 * @param {string} query
 * @param {string} schoolId
 * @param {{ topK?: number, schoolPlan?: string | null, subject?: string | null }} [options]
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

  if (subject) {
    return prisma.$queryRawUnsafe(
      `SELECT mc.id, mc.content, mc."materialId", mc."chunkIndex",
              sm.title AS "materialTitle", sm.subject AS "materialSubject",
              1 - (mc.embedding <=> $1::vector) AS similarity
       FROM "MaterialChunk" mc
       INNER JOIN "SchoolMaterial" sm ON sm.id = mc."materialId"
       WHERE mc."schoolId" = $2
         AND sm."schoolId" = $2
         AND LOWER(sm.subject) = LOWER($3)
       ORDER BY mc.embedding <=> $1::vector
       LIMIT $4`,
      vec,
      schoolId,
      subject,
      topK
    )
  }

  return prisma.$queryRawUnsafe(
    `SELECT mc.id, mc.content, mc."materialId", mc."chunkIndex",
            sm.title AS "materialTitle", sm.subject AS "materialSubject",
            1 - (mc.embedding <=> $1::vector) AS similarity
     FROM "MaterialChunk" mc
     INNER JOIN "SchoolMaterial" sm ON sm.id = mc."materialId"
     WHERE mc."schoolId" = $2
       AND sm."schoolId" = $2
     ORDER BY mc.embedding <=> $1::vector
     LIMIT $3`,
    vec,
    schoolId,
    topK
  )
}
