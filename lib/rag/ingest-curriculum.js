import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { embedTexts, vectorLiteral } from '@/lib/rag/embed'
import { canUseRAG } from '@/lib/features/ragAccess'
import { formatCurriculumRecords } from '@/lib/curriculum/format-chunk'
import {
  getChemistryCurriculumMeta,
  getChemistryCurriculumRecords,
} from '@/lib/curriculum/chemistry-cdc-2024'

/**
 * Ingest pre-formed curriculum chunks (one syllabus subtopic per chunk).
 * @param {{
 *   schoolId: string
 *   materialId: string
 *   chunks: string[]
 *   schoolPlan?: string | null
 * }} params
 */
export async function ingestCurriculumChunks({ schoolId, materialId, chunks, schoolPlan }) {
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

  const normalized = (chunks || []).map((c) => String(c || '').trim()).filter(Boolean)
  if (!normalized.length) {
    throw new Error('No curriculum chunks to index')
  }

  const embeddings = await embedTexts(normalized, {
    provider: access.embedProvider,
    task: 'passage',
  })

  await prisma.$executeRaw`DELETE FROM "MaterialChunk" WHERE "materialId" = ${materialId} AND "schoolId" = ${schoolId}`

  for (let i = 0; i < normalized.length; i++) {
    const id = crypto.randomUUID()
    const vec = vectorLiteral(embeddings[i])
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MaterialChunk" (id, "schoolId", "materialId", "chunkIndex", content, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)`,
      id,
      schoolId,
      materialId,
      i,
      normalized[i],
      vec
    )
  }

  return { chunksIndexed: normalized.length, materialTitle: material.title }
}

/**
 * Seed Zambia CDC 2024 Chemistry syllabus into a school's RAG index.
 * @param {{
 *   schoolId: string
 *   uploadedBy: string
 *   schoolPlan?: string | null
 *   gradeLevel?: string | null
 * }} params
 */
export async function seedChemistryCurriculumMaterial({
  schoolId,
  uploadedBy,
  schoolPlan,
  gradeLevel = 'Forms 1–4',
}) {
  const meta = getChemistryCurriculumMeta()
  const records = getChemistryCurriculumRecords()
  const chunks = formatCurriculumRecords(records, meta)

  const existing = await prisma.schoolMaterial.findFirst({
    where: {
      schoolId,
      title: meta.title,
      subject: 'Chemistry',
    },
    select: { id: true },
  })

  let materialId = existing?.id
  if (!materialId) {
    const created = await prisma.schoolMaterial.create({
      data: {
        schoolId,
        title: meta.title,
        subject: 'Chemistry',
        gradeLevel,
        fileUrl: 'cdc://chemistry-2024',
        fileType: 'json',
        uploadedBy,
      },
    })
    materialId = created.id
  }

  const result = await ingestCurriculumChunks({
    schoolId,
    materialId,
    chunks,
    schoolPlan,
  })

  return { materialId, ...result, recordCount: records.length }
}
