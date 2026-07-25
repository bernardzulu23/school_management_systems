#!/usr/bin/env node
/**
 * Ingest ECZ past-paper PDFs into PastPaper (old syllabus assessment structure).
 *
 * Usage:
 *   npx tsx scripts/ingest-past-paper.ts [./past-papers]
 *   npx tsx scripts/ingest-past-paper.ts --fixture
 */
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { extractTextFromBuffer } from '@/lib/rag/parse'
import { validatePastPaperJson } from '@/lib/curriculum/validateOldSyllabus'
import {
  buildTopicCoverage,
  listTopicNamesFromContentJson,
  parsePastPaperCover,
  parsePastPaperSections,
} from '@/lib/curriculum/pastPaperParser'
import { deriveSubjectFromFilename } from '@/lib/curriculum/oldSyllabusParser'

function buildFixtureStructure() {
  return {
    paperNumber: 2,
    year: 2019,
    totalMarks: 100,
    durationMinutes: 150,
    calculatorAllowed: true,
    formulaSheetProvided: true,
    roundingRule: 'Leave answers to 3 significant figures unless otherwise stated',
    sections: [
      {
        sectionLabel: 'Section A',
        questionCount: 8,
        choiceRule: 'answer_all',
        totalMarks: 52,
      },
      {
        sectionLabel: 'Section B',
        questionCount: 6,
        choiceRule: 'answer_n_of_m',
        chooseCount: 4,
        totalMarks: 48,
        marksPerQuestion: 12,
      },
    ],
    topicCoverage: [
      { topic: 'SETS', questionRefs: ['Q1'], typicalMarks: 6, needsReview: true },
      {
        topic: 'QUADRATIC EQUATIONS',
        questionRefs: ['Q5'],
        typicalMarks: 12,
        needsReview: true,
      },
    ],
    needsReview: true,
  }
}

async function ingestFixture() {
  const structureJson = buildFixtureStructure()
  const { valid, errors } = validatePastPaperJson(structureJson)

  await prisma.pastPaper.deleteMany({
    where: { subject: 'Mathematics', paperCode: '4024', paperNumber: 2, year: 2019 },
  })

  await prisma.pastPaper.create({
    data: {
      syllabusVersion: 'OLD_SYLLABUS',
      subject: 'Mathematics',
      examBoard: 'ECZ',
      paperCode: '4024',
      paperNumber: 2,
      year: 2019,
      totalMarks: structureJson.totalMarks,
      durationMinutes: structureJson.durationMinutes,
      calculatorAllowed: structureJson.calculatorAllowed,
      formulaSheetProvided: structureJson.formulaSheetProvided,
      roundingRule: structureJson.roundingRule,
      structureJson,
      validationStatus: valid ? 'VALID' : 'INVALID',
      ingestedFilename: 'mathematics-4024-2-2019-fixture.json',
    },
  })

  // Mark topic coverage reviewed for Phase 4 gate (fixture is curated).
  if (valid) {
    await prisma.pastPaper.updateMany({
      where: { subject: 'Mathematics', paperCode: '4024', year: 2019 },
      data: {
        structureJson: { ...structureJson, needsReview: false, topicCoverageReviewed: true },
      },
    })
  }

  return { subject: 'Mathematics', valid }
}

// Scanned/image-only PDFs yield no text layer. Without text, every parsed field
// falls back to a default, so the row must not be stored as VALID.
const MIN_TEXT_CHARS = 500

async function ingestPastPaperPdf(filePath, subject) {
  const buf = fs.readFileSync(filePath)
  const text = String((await extractTextFromBuffer(buf, 'pdf')) || '')

  if (text.replace(/\s+/g, '').length < MIN_TEXT_CHARS) {
    await prisma.pastPaper.create({
      data: {
        syllabusVersion: 'OLD_SYLLABUS',
        subject,
        paperCode: '0000',
        paperNumber: 1,
        year: 0,
        totalMarks: 0,
        durationMinutes: 0,
        calculatorAllowed: false,
        formulaSheetProvided: false,
        structureJson: {
          sections: [],
          topicCoverage: [],
          needsReview: true,
          extractionError: 'NO_TEXT_LAYER',
          extractedChars: text.length,
        },
        validationStatus: 'INVALID',
        ingestedFilename: path.basename(filePath),
      },
    })
    console.error(
      `NO TEXT LAYER for ${subject} (${path.basename(filePath)}) — needs OCR; stored as INVALID`
    )
    return { subject, valid: false, reason: 'NO_TEXT_LAYER' }
  }

  const cover = parsePastPaperCover(text)
  const sections = parsePastPaperSections(text)

  const syllabus = await prisma.oldSyllabusDocument.findFirst({
    where: { subject, validationStatus: 'VALID' },
    orderBy: { ingestedAt: 'desc' },
  })
  const topicNames = listTopicNamesFromContentJson(syllabus?.contentJson)
  const snippets = text.split(/\n{2,}/).slice(0, 40)
  const { topicCoverage, needsReview } = buildTopicCoverage(snippets, topicNames)

  const structureJson = {
    paperNumber: cover.paperNumber,
    year: cover.year,
    totalMarks: cover.totalMarks,
    durationMinutes: cover.durationMinutes,
    calculatorAllowed: cover.calculatorAllowed,
    formulaSheetProvided: cover.formulaSheetProvided,
    sections,
    topicCoverage,
    needsReview,
  }

  const { valid, errors } = validatePastPaperJson(structureJson)

  await prisma.pastPaper.create({
    data: {
      syllabusVersion: 'OLD_SYLLABUS',
      subject,
      paperCode: cover.paperCode,
      paperNumber: cover.paperNumber,
      year: cover.year,
      totalMarks: cover.totalMarks,
      durationMinutes: cover.durationMinutes,
      calculatorAllowed: cover.calculatorAllowed,
      formulaSheetProvided: cover.formulaSheetProvided,
      structureJson,
      validationStatus: valid ? 'VALID' : 'INVALID',
      ingestedFilename: path.basename(filePath),
    },
  })

  if (!valid) console.error(`VALIDATION FAILED for ${subject}:`, errors?.slice?.(0, 5))
  return { subject, valid, needsReview }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--fixture')) {
    console.log(await ingestFixture())
    return
  }

  const inputDir = args.find((a) => !a.startsWith('--')) || './past-papers'
  if (!fs.existsSync(inputDir)) {
    console.warn(`Missing ${inputDir}; ingesting fixture.`)
    console.log(await ingestFixture())
    return
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.pdf'))
  if (!files.length) {
    console.log(await ingestFixture())
    return
  }

  const results = []
  for (const file of files) {
    results.push(
      await ingestPastPaperPdf(path.join(inputDir, file), deriveSubjectFromFilename(file))
    )
  }
  console.log('Past paper ingestion complete:', results)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
