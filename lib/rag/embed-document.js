import prisma from '@/lib/prisma'
import { chunkText } from '@/lib/rag/chunk'
import { embedTexts, vectorLiteral } from '@/lib/rag/embed'
import { embedWithFallback } from '@/lib/ai/embeddings/orchestrator'

/**
 * Phase 1: dual-write embeddings for new document-style content.
 *
 * - Keeps existing HuggingFace 384-dim vectors live for current search.
 * - Adds a second 768-dim column (`embedding_v2`) populated via Gemini/Jina fallback.
 *
 * This helper is not yet wired into existing RAG ingestion; call it from
 * new upload flows that use the `document_chunks` table.
 *
 * @param {string} documentId
 * @param {string} rawText
 * @param {Record<string, unknown>} [metadata]
 */
export async function embedAndStoreDocument(documentId, rawText, metadata = {}) {
  const chunks = chunkText(rawText)
  if (!chunks.length) return

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i]

    // Existing 384-dim embedding (HuggingFace) — keep current search behavior.
    const [hfVector] = await embedTexts([content], { provider: 'huggingface' })
    const hfVectorStr = vectorLiteral(hfVector)

    // New 768-dim embedding (Gemini + Jina fallback).
    const { vector: newVector, provider } = await embedWithFallback(content, 'retrieval.passage')
    const newVectorStr = `[${newVector.join(',')}]`

    // Dual-write into document_chunks; assumes embedding (384) and embedding_v2 (768) columns exist.
    await prisma.$executeRaw`
      INSERT INTO document_chunks
        (document_id, chunk_index, content, embedding, embedding_v2, metadata)
      VALUES (
        ${documentId}::uuid,
        ${i},
        ${content},
        ${hfVectorStr}::vector(384),
        ${newVectorStr}::vector(768),
        ${JSON.stringify({ ...metadata, embeddedBy: provider })}::jsonb
      )
      ON CONFLICT (document_id, chunk_index) DO UPDATE SET
        content      = EXCLUDED.content,
        embedding    = EXCLUDED.embedding,
        embedding_v2 = EXCLUDED.embedding_v2,
        metadata     = EXCLUDED.metadata,
        updated_at   = NOW()
    `
  }
}
