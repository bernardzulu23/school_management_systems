#!/usr/bin/env node
/**
 * Ingest old (pre-CBC) O-Level syllabus PDFs into OldSyllabusDocument.
 *
 * Usage:
 *   npx tsx scripts/ingest-old-syllabus.ts [./old-syllabus-pdfs]
 *   npx tsx scripts/ingest-old-syllabus.ts --fixture
 */
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { extractTextFromBuffer } from '@/lib/rag/parse'
import { validateOldSyllabusJson } from '@/lib/curriculum/validateOldSyllabus'
import { deriveSubjectFromFilename, parseOldSyllabusText } from '@/lib/curriculum/oldSyllabusParser'

async function ingestFixtureMathematics() {
  const fixturePath = path.join(
    process.cwd(),
    'data/old-syllabus/fixtures/mathematics-o-level.json'
  )
  const parsedJson = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  const { valid, errors } = validateOldSyllabusJson(parsedJson)

  await prisma.oldSyllabusDocument.deleteMany({
    where: { subject: 'Mathematics', ingestedFilename: 'mathematics-o-level.json' },
  })

  await prisma.oldSyllabusDocument.create({
    data: {
      subject: 'Mathematics',
      sourcePublisher: parsedJson.sourceDocument?.publisher,
      sourceYear: parsedJson.sourceDocument?.year,
      sourceIsbn: parsedJson.sourceDocument?.isbn,
      timeAllocation: parsedJson.timeAllocation,
      domains: parsedJson.domains,
      contentJson: parsedJson,
      validationStatus: valid ? 'VALID' : 'INVALID',
      validationErrors: valid ? null : errors,
      ingestedFilename: 'mathematics-o-level.json',
    },
  })

  return { subject: 'Mathematics', valid }
}

// Image-only PDFs have no text layer; parsing them produces empty content.
const MIN_TEXT_CHARS = 2000

async function ingestOldSyllabusPdf(filePath, subject) {
  const buf = fs.readFileSync(filePath)
  const rawText = await extractTextFromBuffer(buf, 'pdf')
  const correctedText = String(rawText || '')

  if (correctedText.replace(/\s+/g, '').length < MIN_TEXT_CHARS) {
    console.error(`NO TEXT LAYER for ${subject} (${path.basename(filePath)}) — needs OCR; skipped`)
    return { subject, valid: false, reason: 'NO_TEXT_LAYER' }
  }

  const parsedJson = parseOldSyllabusText(correctedText, subject)
  const { valid, errors } = validateOldSyllabusJson(parsedJson)

  await prisma.oldSyllabusDocument.create({
    data: {
      subject,
      sourcePublisher: parsedJson.sourceDocument?.publisher ?? null,
      sourceYear: parsedJson.sourceDocument?.year ?? null,
      sourceIsbn: parsedJson.sourceDocument?.isbn ?? null,
      timeAllocation: parsedJson.timeAllocation ?? null,
      domains: parsedJson.domains,
      contentJson: parsedJson,
      validationStatus: valid ? 'VALID' : 'INVALID',
      validationErrors: valid ? null : errors,
      ingestedFilename: path.basename(filePath),
    },
  })

  if (!valid) {
    console.error(`VALIDATION FAILED for ${subject}:`, errors?.slice?.(0, 5) || errors)
  }

  return { subject, valid }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--fixture')) {
    const result = await ingestFixtureMathematics()
    console.log('Fixture ingest:', result)
    return
  }

  const inputDir = args.find((a) => !a.startsWith('--')) || './old-syllabus-pdfs'
  if (!fs.existsSync(inputDir)) {
    console.warn(`Input dir missing: ${inputDir}. Ingesting Mathematics fixture instead.`)
    const result = await ingestFixtureMathematics()
    console.log('Fixture ingest:', result)
    return
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.pdf'))
  if (!files.length) {
    console.warn('No PDFs found; ingesting Mathematics fixture instead.')
    const result = await ingestFixtureMathematics()
    console.log('Fixture ingest:', result)
    return
  }

  const results = []
  for (const file of files) {
    const subject = deriveSubjectFromFilename(file)
    results.push(await ingestOldSyllabusPdf(path.join(inputDir, file), subject))
  }
  console.log('Ingestion complete:', results)
  console.log(
    'Invalid:',
    results.filter((r) => !r.valid).map((r) => r.subject)
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
