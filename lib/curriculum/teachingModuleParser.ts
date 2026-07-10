/**
 * Parse MoE Teaching Module PDFs (how to teach) — separate from syllabus ingest.
 */

import fs from 'fs'
import path from 'path'
import { extractTextFromBuffer } from '@/lib/rag/parse'
import { extractSubjectFromFilename, normalizeKnownSubject } from '@/lib/curriculum/syllabusParsing'

function slugify(subject: string): string {
  return String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export type TeachingModuleLesson = {
  week?: number
  lesson?: number
  title: string
  topics: string[]
  activities: string[]
  resources: string[]
  assessment: string[]
  notes: string
}

export type TeachingModuleJSON = {
  subject: string
  form: number | null
  term: number | null
  sourceFile: string
  lessons: TeachingModuleLesson[]
  metadata?: {
    extractedAt?: string
    rawTextLength?: number
    pilot?: boolean
  }
}

function cleanModuleLine(line: string): string {
  return String(line || '')
    .replace(/\.{2,}.*/g, '') // dotted leaders + page numbers from TOC
    .replace(/\s+\d{1,3}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeTocNoise(line: string): boolean {
  const s = String(line || '')
  if (/\.{4,}/.test(s)) return true
  if (/^sub[- ]?topic\s*\d/i.test(s)) return true
  if (/how to use this module/i.test(s)) return true
  if (/encourage active learning/i.test(s)) return true
  if (/monitor student progress/i.test(s)) return true
  if (s.length < 8) return true
  return false
}

function normalizeWhitespace(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function parseFormTermFromFilename(filename: string): {
  form: number | null
  term: number | null
} {
  const base = String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
  const form =
    base.match(/\bForm[-_\s]*([1-6])(?!\d)/i)?.[1] ||
    base.match(/\bF([1-6])(?![0-9a-z])/i)?.[1] ||
    null
  const term =
    base.match(/\bTerm[-_\s]*([1-3])(?!\d)/i)?.[1] ||
    base.match(/\bT([1-3])(?![0-9a-z])/i)?.[1] ||
    null
  return {
    form: form ? Number(form) : null,
    term: term ? Number(term) : null,
  }
}

export function resolveTeachingModuleSubject(filename: string, text = ''): string | null {
  const fromName = extractSubjectFromFilename(
    String(filename || '')
      .replace(/teaching[-_\s]*module/gi, ' ')
      .replace(/module/gi, ' ')
  )
  if (fromName) return fromName

  const fromText = normalizeKnownSubject(
    text.slice(0, 2000).match(/([A-Za-z][A-Za-z\s&]{2,40})\s+TEACHING\s+MODULE/i)?.[1] || ''
  )
  return fromText
}

function collectBullets(block: string, headingRe: RegExp, stopRes: RegExp[]): string[] {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const out: string[] = []
  let inSection = false
  for (const line of lines) {
    if (headingRe.test(line)) {
      inSection = true
      continue
    }
    if (inSection && stopRes.some((re) => re.test(line))) break
    if (inSection) {
      const cleaned = cleanModuleLine(line.replace(/^[\d.)\-•*]+\s*/, ''))
      if (
        cleaned.length > 4 &&
        cleaned.length < 200 &&
        !looksLikeTocNoise(line) &&
        !looksLikeTocNoise(cleaned)
      ) {
        out.push(cleaned)
      }
    }
    if (out.length >= 12) break
  }
  return out
}

/**
 * Heuristic lesson extraction from teaching-module text.
 */
export function extractLessonsFromModuleText(text: string): TeachingModuleLesson[] {
  const normalized = normalizeWhitespace(text)
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const startRe = /^(?:week|lesson|topic|unit)\s*(\d+[a-z]?)[:.\s\-–]+(.+)$/i
  const starts: { index: number; week?: number; title: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(startRe)
    if (m) {
      const n = Number.parseInt(m[1], 10)
      const kind = lines[i].match(/^(week|lesson|topic|unit)/i)?.[1]?.toLowerCase()
      starts.push({
        index: i,
        week: kind === 'week' || kind === 'lesson' ? n : undefined,
        title: cleanModuleLine(m[2]) || `Lesson ${m[1]}`,
      })
    }
  }

  if (starts.length === 0) {
    // Fallback: numbered headings
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\d{1,2})[.)]\s+([A-Z].{6,100})$/)
      if (m) {
        starts.push({ index: i, week: Number(m[1]), title: m[2].trim() })
      }
    }
  }

  if (starts.length === 0) {
    const activities = collectBullets(normalized, /activit|teaching\s+method|methodology/i, [
      /assessment/i,
      /resource/i,
      /week\s+\d+/i,
    ]).slice(0, 10)
    const resources = collectBullets(normalized, /resources?/i, [
      /assessment/i,
      /week\s+\d+/i,
      /references?/i,
    ]).slice(0, 8)
    if (!activities.length && !resources.length) return []
    return [
      {
        title: 'Module teaching activities',
        topics: [],
        activities,
        resources,
        assessment: collectBullets(normalized, /assessment/i, [/resource/i, /week\s+\d+/i]).slice(
          0,
          6
        ),
        notes: 'Extracted from module without clear week/lesson headings',
      },
    ]
  }

  const lessons: TeachingModuleLesson[] = []
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s]
    const end = s + 1 < starts.length ? starts[s + 1].index : lines.length
    const block = lines.slice(start.index, end).join('\n')
    const topics: string[] = []
    for (const line of lines.slice(start.index + 1, Math.min(start.index + 8, end))) {
      if (/activit|assessment|resource|competenc|outcome/i.test(line)) break
      if (line.length > 6 && line.length < 120) {
        topics.push(line.replace(/^[\d.)\-•*]+\s*/, '').trim())
      }
      if (topics.length >= 5) break
    }

    lessons.push({
      week: start.week,
      lesson: s + 1,
      title: start.title,
      topics,
      activities: collectBullets(
        block,
        /activit|teaching\s+method|methodology|learning\s+activit/i,
        [/assessment/i, /resource/i, /week\s+\d+/i, /lesson\s+\d+/i]
      ).slice(0, 8),
      resources: collectBullets(block, /resources?/i, [
        /assessment/i,
        /week\s+\d+/i,
        /lesson\s+\d+/i,
        /references?/i,
      ]).slice(0, 6),
      assessment: collectBullets(block, /assessment/i, [
        /resource/i,
        /week\s+\d+/i,
        /lesson\s+\d+/i,
      ]).slice(0, 6),
      notes: '',
    })
  }

  return lessons.slice(0, 40)
}

export async function parseTeachingModuleFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<TeachingModuleJSON | null> {
  const raw = await extractTextFromBuffer(buffer, 'pdf')
  const text = normalizeWhitespace(raw)
  if (!text || text.length < 40) {
    throw new Error(`Could not extract enough text from teaching module: ${filename}`)
  }

  const subject = resolveTeachingModuleSubject(filename, text)
  if (!subject) return null

  const { form, term } = parseFormTermFromFilename(filename)
  const lessons = extractLessonsFromModuleText(text)

  return {
    subject,
    form,
    term,
    sourceFile: path.basename(filename),
    lessons,
    metadata: {
      extractedAt: new Date().toISOString(),
      rawTextLength: text.length,
    },
  }
}

export function teachingModuleOutputPath(
  module: TeachingModuleJSON,
  rootDir = 'data/teaching-modules'
): string {
  const subjectSlug = slugify(module.subject)
  const formPart = module.form ? `form${module.form}` : 'form-unknown'
  const termPart = module.term ? `term${module.term}` : 'term-unknown'
  return path.join(rootDir, subjectSlug, `${formPart}-${termPart}.json`)
}

/**
 * Process Teaching Module PDFs. Optionally filter by subject allowlist (pilot).
 */
export async function processTeachingModulesFolder(
  folderPath: string,
  options?: { subjects?: string[]; limit?: number }
): Promise<TeachingModuleJSON[]> {
  const abs = path.isAbsolute(folderPath) ? folderPath : path.join(process.cwd(), folderPath)
  if (!fs.existsSync(abs)) {
    throw new Error(`Teaching Module folder not found: ${abs}`)
  }

  const allow = (options?.subjects || []).map((s) => s.toLowerCase())
  let entries = fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.pdf'))
  if (allow.length) {
    entries = entries.filter((f) => {
      const subj = resolveTeachingModuleSubject(f)
      return subj && allow.includes(subj.toLowerCase())
    })
  }
  if (options?.limit && options.limit > 0) {
    entries = entries.slice(0, options.limit)
  }

  const out: TeachingModuleJSON[] = []
  for (const entry of entries) {
    try {
      const full = path.join(abs, entry)
      const buffer = fs.readFileSync(full)
      const parsed = await parseTeachingModuleFromBuffer(buffer, entry)
      if (!parsed) {
        console.warn(`Skipping ${entry}: could not resolve CBC subject`)
        continue
      }
      if (!parsed.lessons.length) {
        console.warn(`Skipping ${entry}: no lessons extracted`)
        continue
      }
      out.push(parsed)
    } catch (err) {
      console.warn(`✗ ${entry}:`, err instanceof Error ? err.message : err)
    }
  }
  return out
}

export async function exportTeachingModulesAsJSON(
  modules: TeachingModuleJSON[],
  outputRoot = 'data/teaching-modules',
  options?: { overwrite?: boolean }
): Promise<string[]> {
  const absRoot = path.isAbsolute(outputRoot) ? outputRoot : path.join(process.cwd(), outputRoot)
  const written: string[] = []
  const overwrite = options?.overwrite === true

  for (const mod of modules) {
    const rel = teachingModuleOutputPath(mod, absRoot)
    fs.mkdirSync(path.dirname(rel), { recursive: true })
    if (!overwrite && fs.existsSync(rel)) {
      try {
        const existing = JSON.parse(fs.readFileSync(rel, 'utf8')) as TeachingModuleJSON
        const existingNoise = (existing.lessons || []).some((l) => /\.{3,}/.test(l.title || ''))
        const newNoise = (mod.lessons || []).some((l) => /\.{3,}/.test(l.title || ''))
        if (!existingNoise && (existing.lessons?.length || 0) >= (mod.lessons?.length || 0)) {
          console.warn(`Keeping richer existing ${path.relative(process.cwd(), rel)}`)
          continue
        }
        if (existingNoise && !newNoise) {
          // prefer cleaned parse
        } else if ((existing.lessons?.length || 0) >= (mod.lessons?.length || 0) && !newNoise) {
          console.warn(`Keeping richer existing ${path.relative(process.cwd(), rel)}`)
          continue
        }
      } catch {
        // overwrite
      }
    }
    fs.writeFileSync(rel, JSON.stringify(mod, null, 2), 'utf8')
    written.push(rel)
  }
  return written
}
