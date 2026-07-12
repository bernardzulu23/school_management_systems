/**
 * Load built-in curriculum JSON from data/curriculum (unit-format or CDC-style).
 */

import fs from 'fs'
import path from 'path'
import type { ParsedSyllabusUnit } from '@/lib/curriculum/syllabusParsing'
import { normalizeKnownSubject } from '@/lib/curriculum/syllabusParsing'
import { buildTopicKey } from '@/lib/curriculum/topicKey'

export type CurriculumJSONUnit = {
  unitNumber?: number
  title: string
  topics?: string[]
  duration?: string
  learningOutcomes?: string[]
  suggestedActivities?: string[]
  assessmentMethods?: string[]
  resources?: string[]
}

export type CurriculumJSON = {
  subject: string
  level?: string
  gradesCovered?: number[]
  totalDuration?: string
  units: CurriculumJSONUnit[]
  metadata?: {
    source?: string
    extractedAt?: string
    fileSize?: number
    curated?: boolean
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

function slugify(subject: string): string {
  return String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function curriculumDirs(): string[] {
  const root = path.join(process.cwd(), 'data', 'curriculum')
  return [root, path.join(root, 'form1-4'), path.join(root, 'form1-6')]
}

function listCandidateFiles(subject: string): string[] {
  const slug = slugify(subject)
  const names = [`${slug}-form1-4.json`, `${slug}-form1-6.json`, `${slug}.json`]
  const files: string[] = []
  for (const dir of curriculumDirs()) {
    if (!fs.existsSync(dir)) continue
    for (const name of names) {
      const full = path.join(dir, name)
      if (fs.existsSync(full)) files.push(full)
    }
    // Case-insensitive scan for subject slug in filename
    try {
      for (const entry of fs.readdirSync(dir)) {
        if (!entry.toLowerCase().endsWith('.json')) continue
        if (entry.toLowerCase().includes(slug) && !files.includes(path.join(dir, entry))) {
          files.push(path.join(dir, entry))
        }
      }
    } catch {
      // ignore
    }
  }
  return files
}

export function unitsFromCurriculumJSON(data: CurriculumJSON): ParsedSyllabusUnit[] {
  return (data.units || []).map((u, i) => {
    const durationWeeks = parseDurationWeeks(u.duration)
    const unitNumber = typeof u.unitNumber === 'number' ? u.unitNumber : i + 1
    const topics = asStringArray(u.topics)
    return {
      title: String(u.title || `Unit ${unitNumber}`).trim(),
      topics,
      topicKeys: topics.map((t, ti) =>
        buildTopicKey({
          subject: data.subject,
          gradeOrForm: data.level || (data.gradesCovered || []).join('-'),
          unitNumber,
          topicIndex: ti,
          topicTitle: t,
        })
      ),
      outcomes: asStringArray(u.learningOutcomes),
      activities: asStringArray(u.suggestedActivities),
      assessment: asStringArray(u.assessmentMethods),
      resources: asStringArray(u.resources),
      weekHint: durationWeeks ?? undefined,
      sortOrder: typeof u.unitNumber === 'number' ? u.unitNumber - 1 : i,
      unitNumber,
    }
  })
}

function parseDurationWeeks(duration?: string): number | null {
  if (!duration) return null
  const m = String(duration).match(/(\d+)\s*weeks?/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? Math.min(16, n) : null
}

function gradeMatches(data: CurriculumJSON, gradeOrForm: string): boolean {
  if (!gradeOrForm.trim()) return true
  const level = String(data.level || '')

  // Unit JSON for Form 1–4 / Form 1–6 covers those forms regardless of gradesCovered numbering
  if (/form\s*1\s*[-–to]+\s*4/i.test(level)) {
    if (/\bForm\s*[1-4]\b/i.test(gradeOrForm)) return true
    if (/\bGrade\s*(?:7|8|9|1[01])\b/i.test(gradeOrForm)) return true
  }
  if (/form\s*1\s*[-–to]+\s*6/i.test(level)) {
    if (/\bForm\s*[1-6]\b/i.test(gradeOrForm)) return true
  }

  if (!data.gradesCovered?.length) return true

  const form = gradeOrForm.match(/\bForm\s*([1-6])\b/i)
  const grade = gradeOrForm.match(/\bGrade\s*(1[0-2]|[7-9])\b/i)
  const n = form ? Number(form[1]) : grade ? Number(grade[1]) : null
  if (n == null) return true
  if (data.gradesCovered.includes(n)) return true
  // Form N ↔ Grade N+7 (Form 1 ≈ Grade 8) and Form N ↔ Grade N+6 (Form 1 ≈ Grade 7)
  if (form && (data.gradesCovered.includes(n + 6) || data.gradesCovered.includes(n + 7))) {
    return true
  }
  return false
}

/**
 * Try to load a unit-format curriculum JSON for the subject.
 * Returns null when no matching file exists.
 */
export function loadJsonCurriculum(
  subject: string,
  gradeOrForm = ''
): { subject: string; gradeOrForm: string; units: ParsedSyllabusUnit[]; filePath: string } | null {
  const files = listCandidateFiles(subject)
  for (const filePath of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CurriculumJSON & {
        curriculum?: unknown
        meta?: unknown
      }
      // Skip CDC chunk datasets (handled by chemistry-cdc-2024)
      if (Array.isArray(raw.curriculum) && !Array.isArray(raw.units)) continue
      if (!Array.isArray(raw.units) || raw.units.length === 0) continue
      if (gradeOrForm && !gradeMatches(raw, gradeOrForm)) continue

      const units = unitsFromCurriculumJSON(raw)
      return {
        subject: String(raw.subject || subject).trim() || subject,
        gradeOrForm: gradeOrForm || raw.level || 'Form 1-4',
        units,
        filePath,
      }
    } catch {
      continue
    }
  }
  return null
}

export function listAvailableCurriculumSubjects(): string[] {
  const subjects = new Set<string>()
  for (const dir of curriculumDirs()) {
    if (!fs.existsSync(dir)) continue
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.toLowerCase().endsWith('.json')) continue
      if (entry.includes('cdc-2024')) {
        subjects.add('Chemistry')
        continue
      }
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, entry), 'utf8')) as CurriculumJSON
        if (raw.subject) {
          const title = String(raw.subject).trim().replace(/\s+/g, ' ')
          subjects.add(
            normalizeKnownSubject(title) || title.replace(/\b\w/g, (c) => c.toUpperCase())
          )
        } else {
          const base = entry.replace(/\.json$/i, '').replace(/-form1-[46]$/i, '')
          subjects.add(base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
        }
      } catch {
        // ignore
      }
    }
  }
  return Array.from(subjects).sort((a, b) => a.localeCompare(b))
}
