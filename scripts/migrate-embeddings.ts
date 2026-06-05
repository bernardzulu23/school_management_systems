import { prisma } from '../lib/prisma'
import { embedWithFallback } from '../lib/ai/embeddings/orchestrator'

const BATCH_SIZE = 10
const DELAY_MS = 5000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function migrate() {
  const total = await prisma.$queryRawUnsafe<[{ count: string }]>(
    'SELECT COUNT(*) FROM document_chunks WHERE embedding_v2 IS NULL'
  )

  console.log(`[migrate] ${total[0].count} chunks remaining`)

  let done = 0

  while (true) {
    const chunks = await prisma.$queryRawUnsafe<{ id: string; content: string }[]>(
      'SELECT id, content FROM document_chunks WHERE embedding_v2 IS NULL LIMIT $1',
      BATCH_SIZE
    )

    if (!chunks.length) break

    for (const chunk of chunks) {
      try {
        const { vector, provider } = await embedWithFallback(chunk.content, 'retrieval.passage')

        await prisma.$executeRawUnsafe(
          'UPDATE document_chunks SET embedding_v2 = $1::vector(768) WHERE id = $2::uuid',
          `[${vector.join(',')}]`,
          chunk.id
        )

        done++
        process.stdout.write(`\r[migrate] ${done} done (provider: ${provider})`)
      } catch (err) {
        console.error(`\n[migrate] SKIP id=${chunk.id}:`, err)
        await prisma.$executeRawUnsafe(
          "UPDATE document_chunks SET metadata = COALESCE(metadata, '{}'::jsonb) || '{\"migrationFailed\": true}'::jsonb WHERE id = $1::uuid",
          chunk.id
        )
      }
    }

    await sleep(DELAY_MS)
  }

  console.log('\n[migrate] Complete.')
}

// NOTE: Do not run this in production until you're ready for Phase 2.
// It is safe to stop and restart; already-migrated rows (embedding_v2 IS NOT NULL)
// are skipped on subsequent runs.
migrate().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
