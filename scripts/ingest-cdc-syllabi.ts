#!/usr/bin/env node
/**
 * Ingest Zambia CDC Ordinary Level syllabus PDFs into:
 *   1. data/curriculum/<slug>-cdc-2024.json  (tier-1 dedicated corpus)
 *   2. data/curriculum/form1-4/<slug>-form1-4.json  (tier-2 unit fallback)
 *
 * Skips Chemistry dedicated corpus (hand-curated). Upgrades empty/weak form1-4
 * files; preserves curated files that are richer than the new parse.
 *
 * Usage:
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/ingest-cdc-syllabi.ts
 *   npx ts-node ... scripts/ingest-cdc-syllabi.ts --force-units
 */

import fs from 'fs'
import path from 'path'
import { extractTextFromBuffer } from '@/lib/rag/parse'
import {
  parseCdcSyllabusText,
  cdcRecordsToUnitCurriculum,
  cdcRecordsToDedicatedCorpus,
  isValidCurriculumSubject,
  slugifySubject,
} from '@/lib/curriculum/cdcSyllabusTableParser'
import { extractSubjectFromFilename } from '@/lib/curriculum/syllabusParsing'

const ROOT = process.cwd()
const SYLLABUS_DIR = path.join(ROOT, 'Syllabus')
const CDC_DIR = path.join(ROOT, 'data', 'curriculum')
const UNIT_DIR = path.join(CDC_DIR, 'form1-4')
const FORCE_UNITS = process.argv.includes('--force-units')
const SKIP_DEDICATED = new Set(['chemistry']) // hand-curated gold standard
const SKIP_UNIT_OVERWRITE = new Set(['chemistry']) // keep curated form1-4 unit file

const SOURCE_URLS: Record<string, string> = {
  'agricultural-science':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/AGRICULTURAL-SCIENCE-O-LEVEL-SYLLABUS-FORM-1-4.pdf',
  'art-and-design':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/ART-AND-DESIGN-SYLLABUS-FINAL.pdf',
  biology: 'https://www.edu.gov.zm/wp-content/uploads/2025/04/BIOLOGY-SYLABUS-O-LEVEL-FORM-1-4.pdf',
  chemistry: 'https://www.edu.gov.zm/wp-content/uploads/2025/04/CHEMISTRY-SYLLABUS.pdf',
  'civic-education':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/CIVIC-EDUCATION-SYLLABUS-SCIENCE-O-LEVEL-SYLLABUS-FORM-1-4.pdf',
  commerce:
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/COMMERCE-AND-PRINCIPLES-OF-ACCOUNTS-SYLABUS-CAMERA-READY-O-LEVEL.pdf',
  'computer-science':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/COMPUTER_-SCIENCE-ORDINARY-SYLLABI-FORM-1-4.pdf',
  'design-and-technology':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/DESIGN-AND-TECHNOLOGY-STUDIES.pdf',
  english:
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/ENGLISH-SYLABUS-FORM-1-4-O-LEVELCAMERA-READY.pdf',
  'fashion-and-fabrics':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/FASHION-AND-FABRICS-SYLABUS-O-LEVEL-FORM-1-4.pdf',
  'food-and-nutrition':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/FOOD-AND-NUTRITION-SYLLABUS-FINAL-07-02-2024.pdf',
  french: 'https://www.edu.gov.zm/wp-content/uploads/2025/04/FRENCH-LANGUAGE.pdf',
  geography: 'https://www.edu.gov.zm/wp-content/uploads/2025/04/GEOGRAPHY-SYLLABUS.pdf',
  history: 'https://www.edu.gov.zm/wp-content/uploads/2025/04/HISTORY-SYLLABUS-FORMS-1-4.pdf',
  'hospitality-management':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/HOSPITALITY-MANAGEMENT.pdf',
  'computer-studies':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/ICT_ORDINARY-LEVEL-SYLLABUS-FORMS-1-4.pdf',
  'literature-in-english':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/LITERATURE-IN-ENGLISH-SYLABUS-O-LEVEL-FORM-1-4.pdf',
  mathematics:
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/MATHEMATICS-O-LEVEL-FORMS-1-4.pdf',
  music:
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/MUSIC-ARTS-O-LEVEL-SYLLABUS-FORM-1-4-CAMERA-READY-1.pdf',
  'physical-education':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/PHYSICAL-EDUCATION-SYLLABUS-FORM-1-4.pdf',
  physics:
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/PHYSICS-SYLLABUS-O-LEVEL-FORM-1-4.pdf',
  'religious-education':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/RELIGIOUS-EDUCATION-SYLLABUS.pdf',
  'travel-and-tourism':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/TRAVEL-AND-TOURISM-SYLLABUS.pdf',
  'zambian-languages':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/ZAMBIAN-LANGUAGES-ORDINARY-LEVEL-SYLLABUS-FORM-1-4-FINAL.pdf',
}

function unitContentScore(data: {
  units?: Array<{
    topics?: unknown[]
    learningOutcomes?: unknown[]
    suggestedActivities?: unknown[]
  }>
}) {
  const units = data?.units || []
  let score = 0
  for (const u of units) {
    score += (u.topics || []).length * 3
    score += (u.learningOutcomes || []).length * 2
    score += (u.suggestedActivities || []).length
  }
  return score
}

function shouldWriteUnit(
  existingPath: string,
  next: { units?: unknown[] }
): { write: boolean; reason: string } {
  if (!fs.existsSync(existingPath)) return { write: true, reason: 'missing' }
  if (FORCE_UNITS) return { write: true, reason: 'force' }
  try {
    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'))
    const oldScore = unitContentScore(existing)
    const newScore = unitContentScore(next as Parameters<typeof unitContentScore>[0])
    // Always upgrade empty / topic-less shells
    if (oldScore < 10 && newScore >= 10) return { write: true, reason: 'upgrade-empty' }
    if (newScore > oldScore * 1.25) return { write: true, reason: 'richer' }
    if (existing?.metadata?.curated && oldScore >= newScore) {
      return { write: false, reason: 'keep-curated' }
    }
    if (newScore > oldScore) return { write: true, reason: 'richer' }
    return { write: false, reason: `keep-existing (old=${oldScore} new=${newScore})` }
  } catch {
    return { write: true, reason: 'unreadable-existing' }
  }
}

async function main() {
  if (!fs.existsSync(SYLLABUS_DIR)) {
    console.error(`Syllabus folder not found: ${SYLLABUS_DIR}`)
    process.exit(1)
  }
  fs.mkdirSync(CDC_DIR, { recursive: true })
  fs.mkdirSync(UNIT_DIR, { recursive: true })

  const files = fs
    .readdirSync(SYLLABUS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort()

  const report: Array<Record<string, unknown>> = []

  for (const file of files) {
    const full = path.join(SYLLABUS_DIR, file)
    process.stdout.write(`⏳ ${file}... `)
    try {
      const buffer = fs.readFileSync(full)
      const rawText = await extractTextFromBuffer(buffer, 'pdf')
      const subjectHint = extractSubjectFromFilename(file) || undefined
      const parsed = parseCdcSyllabusText(rawText, {
        subject: subjectHint,
        filenameHint: file,
      })

      if (!isValidCurriculumSubject(parsed.subject)) {
        console.log(`⚠️ skipped (unknown subject: ${parsed.subject})`)
        report.push({ file, status: 'unknown-subject', subject: parsed.subject })
        continue
      }
      if (!parsed.records.length) {
        console.log(`⚠️ skipped (0 records)`)
        report.push({ file, status: 'no-records', subject: parsed.subject })
        continue
      }

      const slug = slugifySubject(parsed.subject)
      const unit = cdcRecordsToUnitCurriculum(parsed, {
        source: file,
        sourceFileBytes: buffer.length,
        sourceUrl: SOURCE_URLS[slug],
      })
      const dedicated = cdcRecordsToDedicatedCorpus(parsed, {
        source: `Ministry of Education, Curriculum Development Centre — ${file}`,
        sourceFileBytes: buffer.length,
      })

      let dedicatedStatus = 'skipped'
      const dedicatedPath = path.join(CDC_DIR, `${slug}-cdc-2024.json`)
      if (!SKIP_DEDICATED.has(slug)) {
        fs.writeFileSync(dedicatedPath, JSON.stringify(dedicated, null, 2) + '\n', 'utf8')
        dedicatedStatus = 'wrote'
      } else {
        dedicatedStatus = 'preserved-chemistry'
      }

      const unitPath = path.join(UNIT_DIR, `${slug}-form1-4.json`)
      let unitDecision = { write: false, reason: 'skipped' }
      if (SKIP_UNIT_OVERWRITE.has(slug)) {
        unitDecision = { write: false, reason: 'preserved-chemistry' }
      } else {
        unitDecision = shouldWriteUnit(unitPath, unit)
        if (unitDecision.write) {
          fs.writeFileSync(unitPath, JSON.stringify(unit, null, 2) + '\n', 'utf8')
        }
      }

      console.log(
        `✅ ${parsed.subject}: ${parsed.records.length} records, ${unit.units.length} units [${dedicatedStatus}; unit=${unitDecision.reason}]`
      )
      report.push({
        file,
        subject: parsed.subject,
        slug,
        records: parsed.records.length,
        units: unit.units.length,
        forms: parsed.forms,
        dedicated: dedicatedStatus,
        unit: unitDecision.reason,
      })
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : err}`)
      report.push({ file, status: 'error', error: String(err) })
    }
  }

  // Mathematics II: if both maths PDFs exist, prefer the richer dedicated corpus already written;
  // also ensure mathematics-ii is not left as a dangling alias — both map to Mathematics via slugify.
  const reportPath = path.join(CDC_DIR, '_ingest-cdc-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(`\n📋 Report: ${reportPath}`)
  console.log(`✅ Done — ${report.filter((r) => r.records).length} subjects ingested`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
