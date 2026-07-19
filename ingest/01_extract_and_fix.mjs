#!/usr/bin/env node
/**
 * Node equivalent of ingest/01_extract_and_fix.py when pymupdf is unavailable.
 *
 * Uses pdf-parse for text + middle-third sample for shift auto-detection
 * (same -40..+40 score_english algorithm). Prefer the Python/pymupdf script
 * when available — it samples a true middle page.
 *
 * Usage:
 *   node ingest/01_extract_and_fix.mjs
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import {
  detectShift,
  shiftDecode,
  middlePageSample,
} from '../lib/curriculum/cdcShiftDetect.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function resolveDir(...candidates) {
  for (const rel of candidates) {
    const p = path.join(ROOT, rel)
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p
  }
  return path.join(ROOT, candidates[0])
}

const SYLLABUS_DIR = resolveDir('Syllabus', path.join('source-pdfs', 'Syllabus'))
const MODULES_DIR = resolveDir(
  'Teaching Module',
  path.join('source-pdfs', 'Teaching Module'),
  'Teaching_Module'
)
const OUT_DIR = path.join(ROOT, 'ingest', 'extracted')
const REPORT_PATH = path.join(OUT_DIR, '_extract-report.json')

function fileHash(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex')
}

function listPdfs(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.toLowerCase().endsWith('.pdf')) out.push(full)
    }
  }
  walk(dir)
  return out.sort()
}

function dedupe(paths) {
  const seen = new Map()
  const unique = []
  const skipped = []
  for (const p of paths) {
    const h = fileHash(p)
    if (seen.has(h)) {
      console.log(`SKIP duplicate: ${path.basename(p)} (same content as ${path.basename(seen.get(h))})`)
      skipped.push({ file: path.basename(p), duplicateOf: path.basename(seen.get(h)), md5: h })
      continue
    }
    seen.set(h, p)
    unique.push(p)
  }
  return { unique, skipped }
}

/**
 * Split flat pdf-parse text into pseudo-pages using form-feed / page breaks when
 * present; otherwise a single page blob (sample still uses middle third).
 */
function toPages(rawText) {
  const text = String(rawText || '')
  const parts = text.split(/\f/).map((t) => t.trim()).filter(Boolean)
  if (parts.length > 1) {
    return parts.map((t, i) => ({ page: i + 1, text: t }))
  }
  // Approximate pages for large docs so structure scripts can chunk (~3000 chars).
  const CHUNK = 3000
  if (text.length <= CHUNK) return [{ page: 1, text }]
  const pages = []
  for (let i = 0; i < text.length; i += CHUNK) {
    pages.push({ page: pages.length + 1, text: text.slice(i, i + CHUNK) })
  }
  return pages
}

async function extractPdf(filePath) {
  const buffer = fs.readFileSync(filePath)
  const parsed = await pdfParse(buffer)
  const raw = String(parsed?.text || '')
  const pageCount = Number(parsed?.numpages) || 0
  const sample = middlePageSample(raw)
  const { shift, confidence } = detectShift(sample)

  if (confidence < 0.5) {
    console.log(
      `WARNING ${path.basename(filePath)}: low confidence (${confidence.toFixed(2)}) on detected ` +
        `shift ${shift} — flag for manual review`
    )
  }

  const decoded = shift !== 0 ? shiftDecode(raw, shift) : raw
  const pages = toPages(decoded).map((p) => ({
    ...p,
    // Keep true PDF page count in metadata; pseudo-pages used for chunking only.
  }))

  return {
    source_file: path.basename(filePath),
    source_path: path.relative(ROOT, filePath),
    md5: fileHash(filePath),
    detected_shift: shift,
    shift_confidence: Math.round(confidence * 1000) / 1000,
    sample_page: 'middle-third',
    page_count: pageCount || pages.length,
    extractor: 'pdf-parse+auto-shift',
    pages,
    needs_manual_review: confidence < 0.5,
  }
}

async function processDir(dirPath, outSubdir) {
  if (!fs.existsSync(dirPath)) {
    console.error(`ERROR: directory not found: ${dirPath}`)
    return []
  }
  const outDir = path.join(OUT_DIR, outSubdir)
  fs.mkdirSync(outDir, { recursive: true })
  const { unique, skipped } = dedupe(listPdfs(dirPath))
  const rows = []

  for (const pdfPath of unique) {
    const result = await extractPdf(pdfPath)
    const outPath = path.join(outDir, `${path.basename(pdfPath, '.pdf')}.json`)
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')
    console.log(
      `${path.basename(pdfPath)}: shift=${result.detected_shift} ` +
        `confidence=${result.shift_confidence} pages=${result.page_count}`
    )
    rows.push({
      file: path.basename(pdfPath),
      out: path.relative(ROOT, outPath),
      detected_shift: result.detected_shift,
      shift_confidence: result.shift_confidence,
      page_count: result.page_count,
      needs_manual_review: result.needs_manual_review,
      md5: result.md5,
    })
  }

  for (const s of skipped) rows.push({ ...s, skipped: true })
  return rows
}

async function main() {
  console.log(`ROOT=${ROOT}`)
  console.log(`Syllabus dir: ${SYLLABUS_DIR} (exists=${fs.existsSync(SYLLABUS_DIR)})`)
  console.log(`Modules dir:  ${MODULES_DIR} (exists=${fs.existsSync(MODULES_DIR)})`)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('\n=== Syllabus ===')
  const syllabus = await processDir(SYLLABUS_DIR, 'syllabus')

  console.log('\n=== Teaching Modules ===')
  const teachingModules = await processDir(MODULES_DIR, 'teaching-modules')

  const report = {
    syllabusDir: SYLLABUS_DIR,
    modulesDir: MODULES_DIR,
    extractor: 'node-pdf-parse',
    syllabus,
    teachingModules,
    syllabusUnique: syllabus.filter((r) => !r.skipped).length,
    modulesUnique: teachingModules.filter((r) => !r.skipped).length,
    modulesSkippedDuplicates: teachingModules.filter((r) => r.skipped).length,
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\nReport: ${REPORT_PATH}`)
  console.log(
    `Syllabus unique=${report.syllabusUnique} | Modules unique=${report.modulesUnique} ` +
      `(skipped dupes=${report.modulesSkippedDuplicates})`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
