#!/usr/bin/env node
/**
 * Ingest Zambia CDC primary / ECE syllabus PDFs.
 *
 * Examples:
 *   npm run ingest:primary
 *   npm run ingest:primary -- --file=TECHNOLOGY-STUDIES-UPPER-PRIMARY.pdf --subject="Technology Studies" --grades=4,5,6
 *   npm run ingest:primary -- --all
 *   npm run ingest:primary -- --ece --all
 *
 * Writes under data/curriculum/primary/ (or data/curriculum/ece/ for ECE).
 * Soft-fail mode (--allow-partial) writes a validation report without unit JSON
 * when coverage thresholds are not met — never fabricates missing content.
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
const PRIMARY_SOURCE_DIR = path.join(ROOT, 'primary_school_syllabus')
const ECE_SOURCE_DIR = path.join(ROOT, 'EARLY_CHILDHOOD_EDUCATION_SYLLABI')
const PRIMARY_OUTPUT_DIR = path.join(ROOT, 'data', 'curriculum', 'primary')
const ECE_OUTPUT_DIR = path.join(ROOT, 'data', 'curriculum', 'ece')

/** Known primary/ECE PDF → ingest defaults */
const PRIMARY_BATCH = [
  {
    file: 'TECHNOLOGY-STUDIES-UPPER-PRIMARY.pdf',
    subject: 'Technology Studies',
    grades: [4, 5, 6],
  },
  {
    file: 'EXPRESSIVE-ARTS-UPPER-PRIMARY-2.pdf',
    subject: 'Expressive Arts',
    grades: [4, 5, 6],
  },
  {
    file: 'LOWER-PRIMARY-SYLLABI-GRADE-1-3-FINAL-CAMERA-REDY-1.pdf',
    subject: 'Lower Primary Omnibus',
    grades: [1, 2, 3],
    splitOmnibus: true,
    allowPartial: true,
    minActivityCoverage: 20,
    minStandardCoverage: 20,
  },
  {
    file: 'INTELLECTUAL-DISABILITY-ENGLISH-LANGUAGE-SYLLABUS-LEVEL-I-3.pdf',
    subject: 'English (Intellectual Disability Level I)',
    grades: [1, 2, 3],
    allowPartial: true,
    minActivityCoverage: 10,
    minStandardCoverage: 10,
  },
  {
    file: 'ZAMBIAN-SIGN-LANGUAGES-Grades-1-3.pdf',
    subject: 'Zambian Sign Language',
    grades: [1, 2, 3],
    allowPartial: true,
    minActivityCoverage: 10,
    minStandardCoverage: 10,
  },
]

const ECE_BATCH = [
  {
    file: 'EARLY-CHILDHOOD-EDUCATION-Syllabi-3-to-5-Year-corrected.pdf',
    subject: 'Early Childhood Education',
    grades: [],
    band: 'ece-3-5',
    allowPartial: true,
    minActivityCoverage: 50,
    minStandardCoverage: 55,
  },
  {
    file: 'INTELLECTUAL-DISABILITY-ECE-SYLLABUS-1.pdf',
    subject: 'Early Childhood Education (Intellectual Disability)',
    grades: [],
    band: 'ece-id',
    allowPartial: true,
    minActivityCoverage: 50,
    minStandardCoverage: 50,
  },
]

function argument(name: string) {
  const prefix = `--${name}=`
  const item = process.argv.find((value) => value.startsWith(prefix))
  return item ? item.slice(prefix.length).trim() : ''
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function parseGrades(value: string) {
  const values = String(value || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7)
  return [...new Set(values)].sort((a, b) => a - b)
}

function validatePilot(
  records: Array<Record<string, unknown>>,
  expectedGrades: number[],
  options: {
    minActivityCoverage?: number
    minStandardCoverage?: number
    educationLevel?: 'primary' | 'ece'
  } = {}
) {
  const ids = records.map((record) => String(record.id || ''))
  const duplicateIds = ids.filter((id, index) => id && ids.indexOf(id) !== index)
  const grades = [
    ...new Set(
      records
        .map((record) => Number(options.educationLevel === 'ece' ? record.form : record.grade))
        .filter(Number.isFinite)
    ),
  ].sort((a, b) => a - b)
  const recordsByGrade = Object.fromEntries(
    grades.map((grade) => [
      String(grade),
      records.filter(
        (record) => Number(options.educationLevel === 'ece' ? record.form : record.grade) === grade
      ).length,
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
    if (record.gradeCodeMismatch) return false
    const grade = Number(options.educationLevel === 'ece' ? record.form : record.grade)
    const topicGrade = Number(String(record.topicNumber || '').split('.')[0])
    return !Number.isFinite(grade) || grade !== topicGrade
  })
  const gradeCodeMismatchRecords = records.filter((record) => Boolean(record.gradeCodeMismatch))
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
  const minActivityCoverage = Number(
    options.minActivityCoverage ?? (argument('min-activity-coverage') || '50')
  )
  const minStandardCoverage = Number(
    options.minStandardCoverage ?? (argument('min-standard-coverage') || '55')
  )

  const gradeCheckOk = expectedGrades.length === 0 || missingGrades.length === 0

  return {
    ok:
      records.length > 0 &&
      duplicateIds.length === 0 &&
      gradeCheckOk &&
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
    gradeCodeMismatchRecordIds: gradeCodeMismatchRecords.map((record) => String(record.id || '')),
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

const LOWER_PRIMARY_SUBJECT_ORDER = [
  'English',
  'Zambian Languages',
  'Mathematics and Science',
  'Creative and Technology Studies',
]

function rekeyPrimaryRecords(records: Array<Record<string, unknown>>) {
  const counts = new Map<string, number>()
  return records.map((record) => {
    const grade = Number(record.grade)
    const parts = String(record.subtopicNumber || '').split('.')
    const topic = Number(parts[1]) || 1
    const subtopic = Number(parts[2]) || 1
    const baseId = `G${grade}-T${topic}-S${subtopic}`
    const sequence = (counts.get(baseId) || 0) + 1
    counts.set(baseId, sequence)
    return {
      ...record,
      id: sequence === 1 ? baseId : `${baseId}-${sequence}`,
    }
  })
}

function splitLowerPrimaryOmnibusRecords(records: Array<Record<string, unknown>>) {
  const missingSubject = records.find((record) => !String(record.subject || '').trim())
  if (missingSubject) {
    throw new Error(
      `Lower Primary omnibus record ${String(missingSubject.id || '?')} is missing a learning-area subject`
    )
  }

  const unexpected = [
    ...new Set(
      records
        .map((record) => String(record.subject || '').trim())
        .filter((subject) => !LOWER_PRIMARY_SUBJECT_ORDER.includes(subject))
    ),
  ]
  if (unexpected.length) {
    throw new Error(`Unexpected Lower Primary omnibus subjects: ${unexpected.join(', ')}`)
  }

  return LOWER_PRIMARY_SUBJECT_ORDER.map((subject) => {
    const indexes = records
      .map((record, index) => (String(record.subject || '').trim() === subject ? index : -1))
      .filter((index) => index >= 0)
    if (!indexes.length) {
      throw new Error(`Lower Primary omnibus section is empty: ${subject}`)
    }
    const start = indexes[0]
    const end = indexes[indexes.length - 1] + 1
    // Sections must be contiguous blocks in source order.
    for (let index = start; index < end; index++) {
      if (String(records[index].subject || '').trim() !== subject) {
        throw new Error(
          `Lower Primary omnibus section "${subject}" is not contiguous around index ${index}`
        )
      }
    }
    return {
      subject,
      start,
      end,
      records: rekeyPrimaryRecords(records.slice(start, end)),
    }
  })
}

function removeStaleLowerPrimaryOmnibusOutputs() {
  for (const file of [
    'lower-primary-omnibus-cdc-2024.json',
    'lower-primary-omnibus-grade1-3.json',
    'lower-primary-omnibus-grade1-4.json',
  ]) {
    const full = path.join(PRIMARY_OUTPUT_DIR, file)
    if (fs.existsSync(full)) fs.unlinkSync(full)
  }
}

function writeLowerPrimarySubjectCorpora({
  parsed,
  source,
  sourceFile,
  sourceFileBytes,
  outputDir,
}: {
  parsed: ReturnType<typeof parseCdcSyllabusText>
  source: string
  sourceFile: string
  sourceFileBytes: number
  outputDir: string
}) {
  const sections = splitLowerPrimaryOmnibusRecords(parsed.records)
  const sectionReports = []

  for (const section of sections) {
    const sectionParsed = {
      ...parsed,
      subject: section.subject,
      records: section.records,
      grades: [1, 2, 3],
    }
    const validation = validatePilot(section.records, [1, 2, 3], {
      educationLevel: 'primary',
      minActivityCoverage: 0,
      minStandardCoverage: 0,
    })
    if (!validation.ok) {
      throw new Error(
        `Lower Primary ${section.subject} split validation failed: ${JSON.stringify(validation)}`
      )
    }

    const slug = slugifySubject(section.subject)
    const dedicated = cdcRecordsToDedicatedCorpus(sectionParsed, {
      source,
      sourceFileBytes,
    })
    const unit = cdcRecordsToUnitCurriculum(sectionParsed, {
      source,
      sourceFileBytes,
      extractionNote:
        'Extracted from the named learning-area section of the official Grades 1–3 omnibus. No curriculum content was fabricated.',
    })
    const dedicatedPath = path.join(outputDir, `${slug}-cdc-2024.json`)
    const unitPath = path.join(outputDir, `${slug}-grade1-3.json`)
    const reportPath = path.join(outputDir, `${slug}-validation.json`)

    fs.writeFileSync(dedicatedPath, `${JSON.stringify(dedicated, null, 2)}\n`, 'utf8')
    fs.writeFileSync(unitPath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8')
    fs.writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          sourceFile,
          subject: section.subject,
          educationLevel: 'primary',
          grades: [1, 2, 3],
          sourceRecordRange: [section.start, section.end - 1],
          ...validation,
        },
        null,
        2
      )}\n`,
      'utf8'
    )

    sectionReports.push({
      subject: section.subject,
      recordCount: section.records.length,
      recordsByGrade: validation.recordsByGrade,
      dedicatedPath,
      unitPath,
      reportPath,
    })
  }

  removeStaleLowerPrimaryOmnibusOutputs()
  return sectionReports
}

async function ingestOne(job: {
  file: string
  subject: string
  grades: number[]
  band?: string
  splitOmnibus?: boolean
  allowPartial?: boolean
  minActivityCoverage?: number
  minStandardCoverage?: number
  sourceDir: string
  outputDir: string
  educationLevel: 'primary' | 'ece'
}) {
  const sourcePath = path.resolve(job.sourceDir, job.file)
  if (!sourcePath.startsWith(path.resolve(job.sourceDir) + path.sep)) {
    throw new Error(`Source must be inside ${job.sourceDir}`)
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`PDF not found: ${sourcePath}`)
  }

  const buffer = fs.readFileSync(sourcePath)
  const rawText = await extractTextFromBuffer(buffer, 'pdf')
  const parsedRaw = parseCdcSyllabusText(rawText, {
    subject: job.subject,
    filenameHint: job.file,
    educationLevel: job.educationLevel,
    trackLearningAreas: Boolean(job.splitOmnibus),
  })

  // Omnibus PDFs can contain appendix/table numbering that resembles a grade
  // outside the declared range. Keep the official requested grade boundary
  // fail-closed and report every excluded row instead of leaking it into JSON.
  const unexpectedGradeRecords =
    job.educationLevel === 'primary' && job.grades.length > 0
      ? parsedRaw.records.filter((record) => !job.grades.includes(Number(record.grade)))
      : []
  const records =
    unexpectedGradeRecords.length > 0
      ? parsedRaw.records.filter((record) => job.grades.includes(Number(record.grade)))
      : parsedRaw.records
  const parsed = {
    ...parsedRaw,
    records,
    grades:
      job.educationLevel === 'primary'
        ? [...new Set(records.map((record) => Number(record.grade)).filter(Number.isFinite))].sort(
            (a, b) => a - b
          )
        : parsedRaw.grades,
  }

  const validation = validatePilot(parsed.records, job.grades, {
    minActivityCoverage: job.minActivityCoverage,
    minStandardCoverage: job.minStandardCoverage,
    educationLevel: job.educationLevel,
  })

  const slug = slugifySubject(job.subject)
  const allowPartial = Boolean(job.allowPartial || hasFlag('allow-partial'))
  fs.mkdirSync(job.outputDir, { recursive: true })
  const reportPath = path.join(job.outputDir, `${slug}-validation.json`)

  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        sourceFile: job.file,
        subject: job.subject,
        band: job.band || null,
        ageBands:
          job.educationLevel === 'ece'
            ? validation.grades.map((code) => (code === 1 ? '3-4 years' : '4-5 years'))
            : undefined,
        educationLevel: job.educationLevel,
        sourceFileBytes: buffer.length,
        extractionNote:
          'Extracted deterministically from the official CDC/ECE PDF. Missing fields are reported; content is never fabricated.',
        rawRecordCount: parsedRaw.records.length,
        excludedUnexpectedGradeRecords: unexpectedGradeRecords.map((record) => ({
          id: String(record.id || ''),
          grade: Number(record.grade),
          topicNumber: String(record.topicNumber || ''),
          topic: String(record.topic || ''),
        })),
        ...validation,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  if (!validation.ok) {
    if (!allowPartial) {
      throw new Error(`Syllabus validation failed for ${job.file}: see ${reportPath}`)
    }
    console.warn(`⚠️  Partial ingest (validation soft-fail): ${job.subject}`)
    console.warn(`    Report: ${path.relative(ROOT, reportPath)}`)
    console.warn(`    Records: ${validation.recordCount}`)
    // Still write dedicated corpus when we have any records so UI can list the resource
    if (validation.recordCount > 0) {
      const dedicated = cdcRecordsToDedicatedCorpus(parsed, {
        source: `Ministry of Education / CDC — ${job.file}`,
        sourceFileBytes: buffer.length,
      })
      const dedicatedPath = path.join(job.outputDir, `${slug}-cdc-2024.json`)
      fs.writeFileSync(dedicatedPath, `${JSON.stringify(dedicated, null, 2)}\n`, 'utf8')
      console.warn(`    Dedicated (partial): ${path.relative(ROOT, dedicatedPath)}`)
    }
    return { ok: false, subject: job.subject, reportPath }
  }

  const minGrade = validation.grades.length ? Math.min(...validation.grades) : 0
  const maxGrade = validation.grades.length ? Math.max(...validation.grades) : 0
  const source = `Ministry of Education, Curriculum Development Centre — ${job.file}`
  const extractionNote =
    'Extracted deterministically from the official primary/ECE CDC PDF with automatic CDC font decoding. No curriculum content was fabricated.'

  if (job.splitOmnibus) {
    const sections = writeLowerPrimarySubjectCorpora({
      parsed,
      source,
      sourceFile: job.file,
      sourceFileBytes: buffer.length,
      outputDir: job.outputDir,
    })
    fs.writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          sourceFile: job.file,
          subject: job.subject,
          educationLevel: 'primary',
          sourceFileBytes: buffer.length,
          extractionNote:
            'The official omnibus was split at validated learning-area boundaries. The generic omnibus corpus is intentionally not emitted.',
          rawRecordCount: parsedRaw.records.length,
          excludedUnexpectedGradeRecords: unexpectedGradeRecords,
          recordCount: parsed.records.length,
          sections: sections.map((section) => ({
            subject: section.subject,
            recordCount: section.recordCount,
            recordsByGrade: section.recordsByGrade,
          })),
        },
        null,
        2
      )}\n`,
      'utf8'
    )
    console.log(`✅ ${job.subject}`)
    console.log(`   Records: ${parsed.records.length}`)
    for (const section of sections) {
      console.log(
        `   ${section.subject}: ${section.recordCount} ${JSON.stringify(section.recordsByGrade)}`
      )
    }
    console.log(`   Validation: ${path.relative(ROOT, reportPath)}`)
    return { ok: true, subject: job.subject, reportPath }
  }

  const unit = cdcRecordsToUnitCurriculum(parsed, {
    source,
    sourceFileBytes: buffer.length,
    extractionNote,
  })
  const dedicated = cdcRecordsToDedicatedCorpus(parsed, {
    source,
    sourceFileBytes: buffer.length,
  })

  const dedicatedPath = path.join(job.outputDir, `${slug}-cdc-2024.json`)
  const unitSuffix =
    job.band ||
    (minGrade && maxGrade
      ? `grade${minGrade}-${maxGrade}`
      : job.educationLevel === 'ece'
        ? 'ece'
        : 'primary')
  const unitPath = path.join(job.outputDir, `${slug}-${unitSuffix}.json`)

  fs.writeFileSync(dedicatedPath, `${JSON.stringify(dedicated, null, 2)}\n`, 'utf8')
  fs.writeFileSync(unitPath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8')

  console.log(`✅ ${job.subject}`)
  console.log(`   Records: ${validation.recordCount}`)
  console.log(`   By grade: ${JSON.stringify(validation.recordsByGrade)}`)
  console.log(`   Dedicated: ${path.relative(ROOT, dedicatedPath)}`)
  console.log(`   Units: ${path.relative(ROOT, unitPath)}`)
  console.log(`   Validation: ${path.relative(ROOT, reportPath)}`)
  return { ok: true, subject: job.subject, reportPath }
}

async function main() {
  const eceMode = hasFlag('ece')
  const wantAll = hasFlag('all')
  const sourceDir = eceMode ? ECE_SOURCE_DIR : PRIMARY_SOURCE_DIR
  const outputDir = eceMode ? ECE_OUTPUT_DIR : PRIMARY_OUTPUT_DIR
  const educationLevel = eceMode ? ('ece' as const) : ('primary' as const)

  if (wantAll) {
    const batch = eceMode ? ECE_BATCH : PRIMARY_BATCH
    let okCount = 0
    let failCount = 0
    for (const item of batch) {
      try {
        const result = await ingestOne({
          ...item,
          sourceDir,
          outputDir,
          educationLevel,
        })
        if (result.ok) okCount++
        else failCount++
      } catch (error) {
        failCount++
        console.error(`❌ ${item.file}:`, error instanceof Error ? error.message : error)
      }
    }
    console.log(`\nDone. ok=${okCount} soft/partial=${failCount}`)
    if (okCount === 0 && failCount > 0) process.exit(1)
    return
  }

  const sourceFile =
    argument('file') ||
    (eceMode
      ? 'EARLY-CHILDHOOD-EDUCATION-Syllabi-3-to-5-Year-corrected.pdf'
      : 'TECHNOLOGY-STUDIES-UPPER-PRIMARY.pdf')
  const batchDefaults =
    (!eceMode ? PRIMARY_BATCH : ECE_BATCH).find(
      (item) => item.file.toLowerCase() === sourceFile.toLowerCase()
    ) || null
  const subject =
    argument('subject') ||
    batchDefaults?.subject ||
    (eceMode ? 'Early Childhood Education' : 'Technology Studies')
  const expectedGrades = parseGrades(
    argument('grades') ||
      (batchDefaults?.grades?.length ? batchDefaults.grades.join(',') : eceMode ? '' : '4,5,6')
  )

  await ingestOne({
    file: sourceFile,
    subject,
    grades: expectedGrades,
    band: argument('band') || batchDefaults?.band || (eceMode ? 'ece-3-5' : undefined),
    splitOmnibus: Boolean(batchDefaults?.splitOmnibus),
    allowPartial: hasFlag('allow-partial') || Boolean(batchDefaults?.allowPartial) || eceMode,
    minActivityCoverage: batchDefaults?.minActivityCoverage,
    minStandardCoverage: batchDefaults?.minStandardCoverage,
    sourceDir,
    outputDir,
    educationLevel,
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
