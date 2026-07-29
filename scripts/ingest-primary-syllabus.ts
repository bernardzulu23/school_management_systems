#!/usr/bin/env node
/**
 * Ingest one Zambia CDC primary syllabus PDF at a time.
 *
 * Default pilot:
 *   primary_school_syllabus/TECHNOLOGY-STUDIES-UPPER-PRIMARY.pdf
 *
 * Writes:
 *   data/curriculum/primary/<slug>-cdc-2024.json
 *   data/curriculum/primary/<slug>-grade<min>-<max>.json
 *   data/curriculum/primary/<slug>-validation.json
 */

import fs from 'fs'
import path from 'path'
import { extractTextFromBuffer } from '@/lib/rag/parse'
import {
  cdcRecordsToDedicatedCorpus,
  cdcRecordsToUnitCurriculum,
  parseCdcSyllabusText,
  slugifySubject,
} from '@/lib/curriculum/cdcSyllabusTableParser'

const ROOT = process.cwd()
const SOURCE_DIR = path.join(ROOT, 'primary_school_syllabus')
const OUTPUT_DIR = path.join(ROOT, 'data', 'curriculum', 'primary')

function argument(name: string) {
  const prefix = `--${name}=`
  const item = process.argv.find((value) => value.startsWith(prefix))
  return item ? item.slice(prefix.length).trim() : ''
}

function parseGrades(value: string) {
  const values = String(value || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7)
  return [...new Set(values)].sort((a, b) => a - b)
}

function validatePilot(records: Array<Record<string, unknown>>, expectedGrades: number[]) {
  const ids = records.map((record) => String(record.id || ''))
  const duplicateIds = ids.filter((id, index) => id && ids.indexOf(id) !== index)
  const grades = [
    ...new Set(records.map((record) => Number(record.grade)).filter(Number.isFinite)),
  ].sort((a, b) => a - b)
  const recordsByGrade = Object.fromEntries(
    grades.map((grade) => [
      String(grade),
      records.filter((record) => Number(record.grade) === grade).length,
    ])
  )
  const missingGrades = expectedGrades.filter((grade) => !grades.includes(grade))
  const incompleteRecords = records.filter(
    (record) =>
      !String(record.topic || '').trim() ||
      !String(record.subtopic || '').trim() ||
      !Array.isArray(record.specificCompetences) ||
      record.specificCompetences.length === 0
  )
  const emptyActivityRecords = records.filter(
    (record) => !Array.isArray(record.learningActivities) || record.learningActivities.length === 0
  )
  const mismatchedGradeRecords = records.filter((record) => {
    const grade = Number(record.grade)
    const topicGrade = Number(String(record.topicNumber || '').split('.')[0])
    return !Number.isFinite(grade) || grade !== topicGrade
  })
  const suspiciousHeadingRecords = records.filter((record) =>
    /[\\$<=>]|\d[A-Z]{2,}/.test(`${String(record.topic || '')} ${String(record.subtopic || '')}`)
  )
  const standardsPresent = records.filter((record) =>
    String(record.expectedStandard || '').trim()
  ).length
  const activityCoveragePercent = Number(
    (((records.length - emptyActivityRecords.length) / Math.max(1, records.length)) * 100).toFixed(
      1
    )
  )
  const standardCoveragePercent = Number(
    ((standardsPresent / Math.max(1, records.length)) * 100).toFixed(1)
  )
  // Some primary PDFs dump activity/standard columns out of row order. Require
  // solid topic/competence coverage, but allow partial activity/standard attach.
  const minActivityCoverage = Number(argument('min-activity-coverage') || '50')
  const minStandardCoverage = Number(argument('min-standard-coverage') || '55')

  return {
    ok:
      records.length > 0 &&
      duplicateIds.length === 0 &&
      missingGrades.length === 0 &&
      incompleteRecords.length === 0 &&
      mismatchedGradeRecords.length === 0 &&
      suspiciousHeadingRecords.length === 0 &&
      activityCoveragePercent >= minActivityCoverage &&
      standardCoveragePercent >= minStandardCoverage,
    recordCount: records.length,
    grades,
    expectedGrades,
    recordsByGrade,
    duplicateIds: [...new Set(duplicateIds)],
    missingGrades,
    incompleteRecordIds: incompleteRecords.map((record) => String(record.id || '')),
    emptyActivityRecordIds: emptyActivityRecords.map((record) => String(record.id || '')),
    mismatchedGradeRecordIds: mismatchedGradeRecords.map((record) => String(record.id || '')),
    suspiciousHeadingRecordIds: suspiciousHeadingRecords.map((record) => String(record.id || '')),
    activityCoverage: {
      present: records.length - emptyActivityRecords.length,
      total: records.length,
      percent: activityCoveragePercent,
      requiredPercent: minActivityCoverage,
    },
    expectedStandardCoverage: {
      present: standardsPresent,
      total: records.length,
      percent: standardCoveragePercent,
      requiredPercent: minStandardCoverage,
    },
  }
}

async function main() {
  const sourceFile = argument('file') || 'TECHNOLOGY-STUDIES-UPPER-PRIMARY.pdf'
  const subject = argument('subject') || 'Technology Studies'
  const expectedGrades = parseGrades(argument('grades') || '4,5,6')
  const sourcePath = path.resolve(SOURCE_DIR, sourceFile)

  if (!sourcePath.startsWith(path.resolve(SOURCE_DIR) + path.sep)) {
    throw new Error('Primary syllabus source must be inside primary_school_syllabus/')
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Primary syllabus PDF not found: ${sourcePath}`)
  }

  const buffer = fs.readFileSync(sourcePath)
  const rawText = await extractTextFromBuffer(buffer, 'pdf')
  const parsed = parseCdcSyllabusText(rawText, {
    subject,
    filenameHint: sourceFile,
    educationLevel: 'primary',
  })

  const validation = validatePilot(parsed.records, expectedGrades)
  if (!validation.ok) {
    throw new Error(`Primary syllabus validation failed: ${JSON.stringify(validation, null, 2)}`)
  }

  const slug = slugifySubject(subject)
  const minGrade = Math.min(...validation.grades)
  const maxGrade = Math.max(...validation.grades)
  const source = `Ministry of Education, Curriculum Development Centre — ${sourceFile}`
  const extractionNote =
    'Extracted deterministically from the official primary CDC PDF with automatic CDC font decoding. No curriculum content was fabricated.'
  const unit = cdcRecordsToUnitCurriculum(parsed, {
    source,
    sourceFileBytes: buffer.length,
    extractionNote,
  })
  const dedicated = cdcRecordsToDedicatedCorpus(parsed, {
    source,
    sourceFileBytes: buffer.length,
  })

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const dedicatedPath = path.join(OUTPUT_DIR, `${slug}-cdc-2024.json`)
  const unitPath = path.join(OUTPUT_DIR, `${slug}-grade${minGrade}-${maxGrade}.json`)
  const reportPath = path.join(OUTPUT_DIR, `${slug}-validation.json`)

  fs.writeFileSync(dedicatedPath, `${JSON.stringify(dedicated, null, 2)}\n`, 'utf8')
  fs.writeFileSync(unitPath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8')
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        sourceFile,
        subject,
        sourceFileBytes: buffer.length,
        ...validation,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  console.log(`Primary syllabus: ${subject}`)
  console.log(`Records: ${validation.recordCount}`)
  console.log(`By grade: ${JSON.stringify(validation.recordsByGrade)}`)
  console.log(`Dedicated: ${path.relative(ROOT, dedicatedPath)}`)
  console.log(`Units: ${path.relative(ROOT, unitPath)}`)
  console.log(`Validation: ${path.relative(ROOT, reportPath)}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
