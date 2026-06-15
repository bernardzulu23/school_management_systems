import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { chunkText } from '@/lib/rag/chunk'
import { embedTexts, vectorLiteral } from '@/lib/rag/embed'
import { canUseRAG } from '@/lib/features/ragAccess'

/**
 * Chunk, embed, and store material text for a school (tenant-scoped).
 * @param {{
 *   schoolId: string
 *   materialId: string
 *   text: string
 *   schoolPlan?: string | null
 * }} params
 */
export async function ingestMaterialText({ schoolId, materialId, text, schoolPlan }) {
  const material = await prisma.schoolMaterial.findFirst({
    where: { id: materialId, schoolId },
    select: { id: true, title: true },
  })
  if (!material) {
    throw new Error('Material not found for this school')
  }

  const access = canUseRAG({ plan: schoolPlan })
  if (!access.enabled) {
    throw new Error('RAG is not enabled for this school plan')
  }

  const chunks = chunkText(text)
  if (!chunks.length) {
    throw new Error('No text content to index')
  }

  const embeddings = await embedTexts(chunks, {
    provider: access.embedProvider,
    task: 'passage',
  })

  await prisma.$executeRaw`DELETE FROM "MaterialChunk" WHERE "materialId" = ${materialId} AND "schoolId" = ${schoolId}`

  for (let i = 0; i < chunks.length; i++) {
    const id = crypto.randomUUID()
    const vec = vectorLiteral(embeddings[i])
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MaterialChunk" (id, "schoolId", "materialId", "chunkIndex", content, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)`,
      id,
      schoolId,
      materialId,
      i,
      chunks[i],
      vec
    )
  }

  return { chunksIndexed: chunks.length, materialTitle: material.title }
}
