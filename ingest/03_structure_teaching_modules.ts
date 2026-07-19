#!/usr/bin/env node
/**
 * Structure teaching-module extracts → data/static-fallback/.
 *
 * Honest layout — form-N directories only when a source PDF resolves to that form:
 *   data/static-fallback/<subject-slug>/form-N/<topic-slug>/*.json
 *   data/static-fallback/<lang-slug>/{language|literature}/form-N/<topic-slug>/*.json
 *
 * Usage:
 *   npx ts-node --transpile-only -r tsconfig-paths/register ingest/03_structure_teaching_modules.ts
 */

import fs from 'fs'
import path from 'path'
import {
  extractLessonsFromModuleText,
  resolveTeachingModuleSubject,
  parseFormTermFromFilename,
} from '@/lib/curriculum/teachingModuleParser'
import { slugifySubject } from '@/lib/curriculum/jsonCurriculumLoader'

const ROOT = process.cwd()
const EXTRACT_DIR = path.join(ROOT, 'ingest', 'extracted', 'teaching-modules')
const OUT_DIR = path.join(ROOT, 'data', 'static-fallback')

const LANGUAGE_SLUGS = new Set([
  'icibemba',
  'bemba',
  'chitonga',
  'cinyanja',
  'kikaonde',
  'lunda',
  'luvale',
  'silozi',
  'french',
])

function topicSlug(title: string, index: number): string {
  const base = String(title || `topic-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return base || `topic-${index + 1}`
}

function isLiteratureFilename(name: string): boolean {
  return /\blit(?:erature)?\b/i.test(name) || /^LIT[-_]/i.test(name)
}

function resolveLangSlug(subject: string, filename: string): string | null {
  const s = slugifySubject(subject)
  if (LANGUAGE_SLUGS.has(s)) return s === 'bemba' ? 'icibemba' : s
  const fromFile = String(filename || '').toLowerCase()
  for (const lang of [
    'icibemba',
    'bemba',
    'chitonga',
    'cinyanja',
    'kikaonde',
    'lunda',
    'luvale',
    'silozi',
    'french',
  ]) {
    if (fromFile.includes(lang)) return lang === 'bemba' ? 'icibemba' : lang
  }
  return null
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

/** Prefer filename form; default Form 1 when unspecified (legacy Form-1 corpus). */
function resolveModuleForm(filename: string, fullText: string): number {
  const fromName = parseFormTermFromFilename(filename).form
  if (fromName && fromName >= 1 && fromName <= 6) return fromName
  const fromText = fullText.slice(0, 4000).match(/\bFORM\s*([1-6])\b/i)?.[1]
  if (fromText) return Number(fromText)
  return 1
}

async function main() {
  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error(`Missing ${EXTRACT_DIR} — run python ingest/01_extract_and_fix.py first`)
    process.exit(1)
  }

  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const files = fs
    .readdirSync(EXTRACT_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()

  const report: Array<Record<string, unknown>> = []
  let written = 0
  const formsSeen = new Set<number>()
  const subjectForms = new Map<string, Set<number>>()

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(EXTRACT_DIR, file), 'utf8'))
    const sourceName = data.source_file || file.replace(/\.json$/i, '.pdf')
    const pages = Array.isArray(data.pages) ? data.pages : []
    const fullText = pages.map((p: { text?: string }) => p.text || '').join('\n')

    if (Number(data.detected_shift) !== 0) {
      console.log(`⚠️ ${sourceName}: unexpected shift ${data.detected_shift} (expected 0)`)
    }

    const { form: formFromFilename, term } = parseFormTermFromFilename(sourceName)
    const form = resolveModuleForm(sourceName, fullText)
    formsSeen.add(form)

    const subject =
      resolveTeachingModuleSubject(sourceName, fullText) ||
      resolveTeachingModuleSubject(sourceName) ||
      'Unknown'
    const subjectSlug = slugifySubject(subject)
    const langSlug = resolveLangSlug(subject, sourceName)
    const lit = isLiteratureFilename(sourceName)
    const outSlug = langSlug || subjectSlug

    if (!subjectForms.has(outSlug)) subjectForms.set(outSlug, new Set())
    subjectForms.get(outSlug)!.add(form)

    let lessons = extractLessonsFromModuleText(fullText)
    if (!lessons.length) {
      // Honest excerpt fallback — still source text, not fabricated objectives.
      lessons = pages.slice(0, 20).map((p: { page: number; text: string }, i: number) => ({
        lesson: i + 1,
        title: `Source excerpt (page ${p.page})`,
        topics: [],
        activities: [],
        resources: [],
        assessment: [],
        notes: String(p.text || '').slice(0, 1200),
      }))
    }

    const formDir = `form-${form}`
    const baseDir = langSlug
      ? path.join(OUT_DIR, langSlug, lit ? 'literature' : 'language', formDir)
      : path.join(OUT_DIR, subjectSlug, formDir)

    fs.mkdirSync(baseDir, { recursive: true })

    const moduleMeta = {
      subject,
      subjectSlug: outSlug,
      form,
      formFromFilename: formFromFilename,
      term: term || null,
      sourceFile: sourceName,
      md5: data.md5,
      detectedShift: data.detected_shift,
      pageCount: data.page_count,
      coverageNote:
        'Form directories exist only where teaching-module source PDFs were ingested. Missing forms must resolve as known-gap, not empty objects.',
      kind: lit ? 'literature' : langSlug ? 'language' : 'subject',
    }

    writeJson(path.join(baseDir, '_module.json'), {
      ...moduleMeta,
      lessonCount: lessons.length,
    })

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      const slug = topicSlug(lesson.title || `lesson-${i + 1}`, i)
      const topicDir = path.join(baseDir, `${String(i + 1).padStart(2, '0')}-${slug}`)
      fs.mkdirSync(topicDir, { recursive: true })
      writeJson(path.join(topicDir, 'lesson-plan.json'), {
        ...moduleMeta,
        topicSlug: slug,
        lesson,
      })
      written++
    }

    console.log(`✅ ${sourceName} → ${path.relative(ROOT, baseDir)} (${lessons.length} topics)`)
    report.push({
      file: sourceName,
      subject,
      form,
      out: path.relative(ROOT, baseDir),
      lessons: lessons.length,
      language: langSlug,
      literature: lit,
    })
  }

  const formCoverage = [...formsSeen].sort((a, b) => a - b)
  const knownGaps = [1, 2, 3, 4].filter((f) => !formsSeen.has(f))

  const stemSlugs = [
    'chemistry',
    'physics',
    'mathematics',
    'biology',
    'computer-science',
    'agricultural-science',
  ]
  const stemForm2 = stemSlugs.filter((s) => subjectForms.get(s)?.has(2))

  writeJson(path.join(OUT_DIR, '_manifest.json'), {
    generatedAt: new Date().toISOString(),
    uniqueModules: files.length,
    topicFilesWritten: written,
    formCoverage,
    knownGaps,
    note: 'Static fallback directories exist only for forms with ingested teaching-module PDFs. Do not claim all forms covered.',
    stemPriorityNote:
      stemForm2.length > 0
        ? `Form 2 STEM present for: ${stemForm2.join(', ')}. Form 3-4 STEM teaching modules still not in bank (CDC Digital Library / MoE as of audit).`
        : 'Next source batch should prioritize Form 2–4 STEM modules — expanding language coverage does not mitigate STEM AI grounding risk.',
    modules: report,
  })

  // Guard: never leave empty form-2/3/4 shells (dirs with no topic children).
  const emptyForms: string[] = []
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name)
      if (!ent.isDirectory()) continue
      if (/^form-[234]$/i.test(ent.name)) {
        const kids = fs
          .readdirSync(full, { withFileTypes: true })
          .filter((c) => c.isDirectory() && !c.name.startsWith('_'))
        if (!kids.length) emptyForms.push(full)
      }
      walk(full)
    }
  }
  walk(OUT_DIR)
  if (emptyForms.length) {
    console.error('ERROR: empty form-2/3/4 directories were created:', emptyForms)
    process.exit(1)
  }

  console.log(
    `\n✅ static-fallback: ${files.length} modules, ${written} topic files (forms: ${formCoverage.join(', ') || 'none'})`
  )
  if (knownGaps.length) {
    console.log(`   knownGaps (no source PDFs in this ingest): ${knownGaps.join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
