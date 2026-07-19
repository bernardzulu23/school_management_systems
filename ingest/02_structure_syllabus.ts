#!/usr/bin/env node
/**
 * Structure shift-corrected syllabus extracts → two-tier curriculum JSON.
 *
 * Reads ingest/extracted/syllabus/*.json (already shift-corrected).
 * Writes:
 *   data/curriculum/<slug>-cdc-2024.json
 *   data/curriculum/form1-4/<slug>-form1-4.json
 *
 * Chemistry gold-standard protected unless --force-chemistry.
 *
 * Mapping decisions:
 *   - Zambian Languages → aggregate CDC corpus (language detail in static-fallback)
 *   - Mathematics II → folded into Mathematics slug
 *
 * Usage:
 *   npx ts-node --transpile-only -r tsconfig-paths/register ingest/02_structure_syllabus.ts
 */

import fs from 'fs'
import path from 'path'
import {
  parseCdcSyllabusText,
  cdcRecordsToUnitCurriculum,
  cdcRecordsToDedicatedCorpus,
  isValidCurriculumSubject,
  slugifySubject,
} from '@/lib/curriculum/cdcSyllabusTableParser'
import { extractSubjectFromFilename } from '@/lib/curriculum/syllabusParsing'

const ROOT = process.cwd()
const EXTRACT_DIR = path.join(ROOT, 'ingest', 'extracted', 'syllabus')
const CDC_DIR = path.join(ROOT, 'data', 'curriculum')
const UNIT_DIR = path.join(CDC_DIR, 'form1-4')
const FORCE_UNITS = process.argv.includes('--force-units')
const FORCE_CHEMISTRY = process.argv.includes('--force-chemistry')
const SKIP_DEDICATED = new Set(FORCE_CHEMISTRY ? [] : ['chemistry'])
const SKIP_UNIT = new Set(FORCE_CHEMISTRY ? [] : ['chemistry'])

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

function unitScore(data: { units?: Array<Record<string, unknown>> }) {
  let score = 0
  for (const u of data?.units || []) {
    score += ((u.topics as unknown[]) || []).length * 3
    score += ((u.learningOutcomes as unknown[]) || (u.outcomes as unknown[]) || []).length * 2
    score += ((u.suggestedActivities as unknown[]) || (u.activities as unknown[]) || []).length
  }
  return score
}

function cdcScore(data: { curriculum?: Array<Record<string, unknown>> }) {
  let score = 0
  for (const r of data?.curriculum || []) {
    score += ((r.specificCompetences as unknown[]) || []).length * 3
    score += ((r.learningActivities as unknown[]) || []).length * 2
    if (r.subtopic) score += 1
    if (r.expectedStandard) score += 1
  }
  return score
}

function shouldWriteUnit(existingPath: string, next: { units?: unknown[] }) {
  if (!fs.existsSync(existingPath)) return { write: true, reason: 'missing' }
  if (FORCE_UNITS) return { write: true, reason: 'force' }
  try {
    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'))
    const oldScore = unitScore(existing)
    const newScore = unitScore(next as Parameters<typeof unitScore>[0])
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

function shouldWriteDedicated(
  existingPath: string,
  next: { curriculum?: unknown[] },
  slug: string
) {
  if (SKIP_DEDICATED.has(slug)) return { write: false, reason: 'preserved-chemistry' }
  if (!fs.existsSync(existingPath)) return { write: true, reason: 'missing' }
  try {
    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'))
    const oldScore = cdcScore(existing)
    const newScore = cdcScore(next as Parameters<typeof cdcScore>[0])
    if (newScore > oldScore * 1.1) return { write: true, reason: 'richer' }
    if (newScore >= Math.max(10, oldScore * 0.85)) {
      return { write: true, reason: 'refresh-shift-corrected' }
    }
    return { write: false, reason: `keep-existing (old=${oldScore} new=${newScore})` }
  } catch {
    return { write: true, reason: 'unreadable-existing' }
  }
}

type Entry = {
  parsed: ReturnType<typeof parseCdcSyllabusText>
  sourceFile: string
  shift: number
  confidence: number
  chunks: number
}

function mergeRecords(into: Entry['parsed'], from: Entry['parsed']) {
  const ids = new Set(into.records.map((r) => r.id))
  for (const r of from.records) {
    if (!ids.has(r.id)) into.records.push(r)
  }
  into.forms = [...new Set(into.records.map((r) => r.form))].sort((a, b) => a - b)
}

async function main() {
  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error(`Missing ${EXTRACT_DIR} — run python ingest/01_extract_and_fix.py first`)
    process.exit(1)
  }
  fs.mkdirSync(CDC_DIR, { recursive: true })
  fs.mkdirSync(UNIT_DIR, { recursive: true })

  const files = fs
    .readdirSync(EXTRACT_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()

  const bySlug = new Map<string, Entry>()
  const report: Array<Record<string, unknown>> = []

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(EXTRACT_DIR, file), 'utf8'))
    const sourceName = data.source_file || file.replace(/\.json$/i, '.pdf')
    const pages = Array.isArray(data.pages) ? data.pages : []
    const chunks = Math.ceil(pages.length / 12) || 1
    const fullText = pages
      .map((p: { page: number; text: string }) => `[page ${p.page}]\n${p.text || ''}`)
      .join('\n\n')
    const subjectHint = extractSubjectFromFilename(sourceName) || undefined

    process.stdout.write(`⏳ ${sourceName} (shift=${data.detected_shift}, chunks=${chunks})... `)

    const parsed = parseCdcSyllabusText(fullText, {
      subject: subjectHint,
      filenameHint: sourceName,
      alreadyDecoded: true,
    })

    if (!isValidCurriculumSubject(parsed.subject)) {
      console.log(`⚠️ unknown subject: ${parsed.subject}`)
      report.push({ file, status: 'unknown-subject', subject: parsed.subject })
      continue
    }
    if (!parsed.records.length) {
      console.log(`⚠️ 0 records`)
      report.push({
        file,
        status: 'no-records',
        subject: parsed.subject,
        shift: data.detected_shift,
      })
      continue
    }

    const slug = slugifySubject(parsed.subject)
    const entry: Entry = {
      parsed,
      sourceFile: sourceName,
      shift: Number(data.detected_shift) || 0,
      confidence: Number(data.shift_confidence) || 0,
      chunks,
    }

    if (bySlug.has(slug)) {
      const prev = bySlug.get(slug)!
      if (parsed.records.length >= prev.parsed.records.length) {
        mergeRecords(parsed, prev.parsed)
        bySlug.set(slug, entry)
      } else {
        mergeRecords(prev.parsed, parsed)
      }
      console.log(`✅ merge→${slug} (${bySlug.get(slug)!.parsed.records.length} records)`)
      report.push({
        file,
        subject: parsed.subject,
        slug,
        status: 'merged',
        records: bySlug.get(slug)!.parsed.records.length,
        shift: data.detected_shift,
      })
      continue
    }

    bySlug.set(slug, entry)
    console.log(`✅ ${parsed.subject}: ${parsed.records.length} records`)
    report.push({
      file,
      subject: parsed.subject,
      slug,
      records: parsed.records.length,
      forms: parsed.forms,
      shift: data.detected_shift,
      confidence: data.shift_confidence,
      chunks,
    })
  }

  console.log('\nWriting corpora…')
  for (const [slug, entry] of bySlug) {
    const { parsed, sourceFile, shift, confidence } = entry
    const note = `Shift-corrected extract (detected_shift=${shift}, confidence=${confidence}) + deterministic CDC table parse. No fabricated content.`
    const unit = cdcRecordsToUnitCurriculum(parsed, {
      source: sourceFile,
      sourceUrl: SOURCE_URLS[slug],
      extractionNote: note,
    })
    const dedicated = cdcRecordsToDedicatedCorpus(parsed, {
      source: `Ministry of Education, Curriculum Development Centre — ${sourceFile}`,
    })
    dedicated.meta.extractionNote = note
    ;(dedicated.meta as Record<string, unknown>).detectedShift = shift
    ;(dedicated.meta as Record<string, unknown>).shiftConfidence = confidence

    const dedicatedPath = path.join(CDC_DIR, `${slug}-cdc-2024.json`)
    let dedicatedDecision = { write: false, reason: 'skipped' }
    if (SKIP_DEDICATED.has(slug)) {
      dedicatedDecision = { write: false, reason: 'preserved-chemistry' }
    } else {
      dedicatedDecision = shouldWriteDedicated(dedicatedPath, dedicated, slug)
      if (dedicatedDecision.write) {
        fs.writeFileSync(dedicatedPath, JSON.stringify(dedicated, null, 2) + '\n', 'utf8')
      }
    }

    const unitPath = path.join(UNIT_DIR, `${slug}-form1-4.json`)
    let unitDecision = { write: false, reason: 'skipped' }
    if (SKIP_UNIT.has(slug)) {
      unitDecision = { write: false, reason: 'preserved-chemistry' }
    } else {
      unitDecision = shouldWriteUnit(unitPath, unit)
      if (unitDecision.write) {
        fs.writeFileSync(unitPath, JSON.stringify(unit, null, 2) + '\n', 'utf8')
      }
    }

    console.log(
      `  ${slug}: dedicated=${dedicatedDecision.reason}; unit=${unitDecision.reason} (${parsed.records.length} records)`
    )
  }

  const mappingNote = {
    zambianLanguages:
      'Kept as single aggregate CDC corpus (zambian-languages). Per-language / literature detail → data/static-fallback/<lang>/{language|literature}/form-1/.',
    mathematicsIi:
      'MATHEMATICS-II-SYLLABUS folded into Mathematics (same slug). Content is Additional Mathematics-style topics in the MoE pack; aliases map mathematics ii → Mathematics. Not a separate grounding subject.',
    chemistry:
      'chemistry-cdc-2024.json and chemistry-form1-4.json preserved unless --force-chemistry.',
    commerceMusicNote:
      'Under pymupdf, Commerce and Music extract largely natively (selective-line decode). Prior +36/+34 observations may reflect a different extractor; auto-detect still runs per file.',
  }

  const reportPath = path.join(CDC_DIR, '_ingest-shift-corrected-report.json')
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ mappingNote, subjects: report, writtenSlugs: [...bySlug.keys()] }, null, 2) +
      '\n',
    'utf8'
  )
  console.log(`\n📋 ${reportPath}`)
  console.log(`✅ ${bySlug.size} subject corpora from shift-corrected extracts`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
