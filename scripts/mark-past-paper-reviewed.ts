/**
 * Mark PastPaper topicCoverage as human-reviewed (clears needsReview).
 * Uses pg + PrismaPg (not Neon WebSocket) — more reliable for CLI scripts.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/mark-past-paper-reviewed.ts
 *   npx tsx --tsconfig tsconfig.json scripts/mark-past-paper-reviewed.ts --subject=Mathematics
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })
config({ path: '.env' })

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL
if (!connectionString) {
  console.error('DATABASE_URL (or DIRECT_URL) is not set')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const subjectArg = process.argv.find((a) => a.startsWith('--subject='))
  const subject = subjectArg ? subjectArg.slice('--subject='.length) : null

  const papers = await prisma.pastPaper.findMany({
    where: {
      validationStatus: 'VALID',
      ...(subject ? { subject } : {}),
    },
    select: {
      id: true,
      subject: true,
      paperCode: true,
      paperNumber: true,
      year: true,
      structureJson: true,
    },
  })

  if (papers.length === 0) {
    console.log(
      subject ? `No VALID past papers found for subject=${subject}` : 'No VALID past papers found'
    )
    return
  }

  const force = process.argv.includes('--force')
  let updated = 0
  let skipped = 0
  for (const paper of papers) {
    const raw = paper.structureJson
    const structure =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...(raw as Record<string, unknown>) }
        : ({} as Record<string, unknown>)
    const coverage = Array.isArray(structure.topicCoverage)
      ? structure.topicCoverage.map((row) =>
          row && typeof row === 'object'
            ? { ...(row as Record<string, unknown>), needsReview: false }
            : row
        )
      : structure.topicCoverage

    // Approving a paper with no tags asserts nothing; usually means OCR is missing.
    if (!Array.isArray(coverage) || coverage.length === 0) {
      if (!force) {
        skipped += 1
        console.warn(
          `Skipped (empty topicCoverage): ${paper.subject} ${paper.ingestedFilename} — re-ingest with OCR, or pass --force`
        )
        continue
      }
    }

    await prisma.pastPaper.update({
      where: { id: paper.id },
      data: {
        structureJson: {
          ...structure,
          topicCoverage: coverage,
          needsReview: false,
          topicCoverageReviewed: true,
          topicCoverageReviewedAt: new Date().toISOString(),
        },
      },
    })
    updated += 1
    console.log(
      `Reviewed: ${paper.subject} ${paper.paperCode}/${paper.paperNumber} (${paper.year})`
    )
  }

  console.log(`Updated ${updated} past paper(s), skipped ${skipped}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
    await pool.end().catch(() => {})
  })
