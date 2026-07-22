/**
 * Syllabus topic index — reusable topic extraction from
 * ingest/extracted/syllabus + data/curriculum/form1-4 for EVERY subject.
 *
 * Used when building/verifying EoC topicAliases and when UIs need a
 * subject-agnostic topic list for ECZ practice / quiz generation.
 */
import fs from 'fs'
import path from 'path'
import {
  findSubjectRegistryEntry,
  type EczSubjectRegistryEntry,
} from '@/lib/ecz/eoc/subjectRegistry'

const INGEST_DIR = path.join(process.cwd(), 'ingest', 'extracted', 'syllabus')
const FORM14_DIR = path.join(process.cwd(), 'data', 'curriculum', 'form1-4')

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

function cleanTopic(raw: string): string {
  return String(raw || '')
    .replace(/^=+\s*/g, '')
    .replace(/\s*=+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectFromUnknown(node: unknown, out: Set<string>, depth = 0) {
  if (depth > 8 || node == null) return
  if (typeof node === 'string') {
    const t = cleanTopic(node)
    if (t.length >= 3 && t.length <= 120) out.add(t)
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) collectFromUnknown(item, out, depth + 1)
    return
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const key of ['topics', 'topic', 'subtopics', 'title', 'unitTitle', 'name']) {
      if (key in obj) collectFromUnknown(obj[key], out, depth + 1)
    }
    for (const key of ['units', 'chapters', 'sections', 'content', 'syllabus']) {
      if (key in obj) collectFromUnknown(obj[key], out, depth + 1)
    }
  }
}

function topicsFromForm14(slug: string): string[] {
  const file = path.join(FORM14_DIR, `${slug}-form1-4.json`)
  if (!fs.existsSync(file)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      units?: Array<{ title?: string; topics?: string[] }>
    }
    const out = new Set<string>()
    for (const u of raw.units || []) {
      if (u.title) out.add(cleanTopic(u.title))
      for (const t of asStringArray(u.topics)) out.add(cleanTopic(t))
    }
    return Array.from(out).filter(Boolean)
  } catch {
    return []
  }
}

function topicsFromIngest(filename: string): string[] {
  const file = path.join(INGEST_DIR, filename)
  if (!fs.existsSync(file)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    const out = new Set<string>()
    collectFromUnknown(raw, out)
    return Array.from(out)
  } catch {
    return []
  }
}

export type SyllabusTopicIndex = {
  entry: EczSubjectRegistryEntry
  topics: string[]
  sources: { form14: boolean; ingest: boolean }
}

/**
 * Load deduped topic strings for a subject (name/code/slug).
 * Prefer form1-4 structured topics; merge ingest extract when present.
 */
export function loadSyllabusTopics(subjectOrCode: string): SyllabusTopicIndex | null {
  const entry = findSubjectRegistryEntry(subjectOrCode)
  if (!entry) return null

  const fromForm = entry.form14Slug ? topicsFromForm14(entry.form14Slug) : []
  const fromIngest = entry.syllabusIngestFile ? topicsFromIngest(entry.syllabusIngestFile) : []
  const merged = new Map<string, string>()
  for (const t of [...fromForm, ...fromIngest]) {
    const key = t.toLowerCase()
    if (!merged.has(key)) merged.set(key, t)
  }

  return {
    entry,
    topics: Array.from(merged.values()).sort((a, b) => a.localeCompare(b)),
    sources: { form14: fromForm.length > 0, ingest: fromIngest.length > 0 },
  }
}

/** Absolute ingest syllabus directory (tests / scripts). */
export function getSyllabusIngestDir() {
  return INGEST_DIR
}
