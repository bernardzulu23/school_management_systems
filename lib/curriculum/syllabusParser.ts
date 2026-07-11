/**
 * Batch syllabus PDF → Curriculum JSON helpers (guide-facing API).
 * Core single-PDF parsing lives in syllabusParsing.ts.
 */

import fs from 'fs'
import path from 'path'
import {
  parseSyllabusFromBuffer,
  isValidCurriculumSubject,
  type ParsedSyllabus,
  type ParsedSyllabusUnit,
} from '@/lib/curriculum/syllabusParsing'
import type { CurriculumJSON, CurriculumJSONUnit } from '@/lib/curriculum/jsonCurriculumLoader'

export type { CurriculumJSON, CurriculumJSONUnit }
export {
  parseSyllabusFromBuffer,
  parseSyllabus,
  extractSubject,
  extractGrade,
  extractUnits,
  extractOutcomes,
  extractActivities,
  isValidCurriculumSubject,
  normalizeKnownSubject,
  KNOWN_CBC_SUBJECTS,
} from '@/lib/curriculum/syllabusParsing'
export type { ParsedSyllabus, ParsedSyllabusUnit } from '@/lib/curriculum/syllabusParsing'

export function slugifySubject(subject: string): string {
  return String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parsedToCurriculumJSON(
  parsed: ParsedSyllabus,
  meta?: { source?: string; fileSize?: number }
): CurriculumJSON {
  const units: CurriculumJSONUnit[] = (parsed.units || []).map((u: ParsedSyllabusUnit, i) => ({
    unitNumber: i + 1,
    title: u.title,
    topics: u.topics || [],
    duration: u.weekHint ? `${u.weekHint} weeks` : undefined,
    learningOutcomes: u.outcomes || [],
    suggestedActivities: u.activities || [],
    assessmentMethods: u.assessment || [],
    resources: u.resources || [],
  }))

  return {
    subject: parsed.subject,
    level: /form\s*[1-6]/i.test(parsed.grade || '') ? 'Form 1-4' : parsed.grade || 'Form 1-4',
    gradesCovered: [7, 8, 9, 10],
    totalDuration: `${Math.max(12, units.length * 3)} weeks`,
    units,
    metadata: {
      source: meta?.source,
      extractedAt: new Date().toISOString(),
      fileSize: meta?.fileSize,
    },
  }
}

/**
 * Parse all PDF files in a folder into CurriculumJSON maps keyed by subject slug.
 */
export async function processSyllabiFolder(
  folderPath: string
): Promise<Map<string, CurriculumJSON>> {
  const abs = path.isAbsolute(folderPath) ? folderPath : path.join(process.cwd(), folderPath)
  if (!fs.existsSync(abs)) {
    throw new Error(`Syllabi folder not found: ${abs}`)
  }

  const entries = fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.pdf'))
  const out = new Map<string, CurriculumJSON>()

  for (const entry of entries) {
    const full = path.join(abs, entry)
    const buffer = fs.readFileSync(full)
    const parsed = await parseSyllabusFromBuffer(buffer, { filenameHint: entry })
    if (!isValidCurriculumSubject(parsed.subject)) {
      console.warn(
        `Skipping ${entry}: subject "${parsed.subject}" is not a known CBC subject (likely a topic heading)`
      )
      continue
    }
    const json = parsedToCurriculumJSON(parsed, { source: entry, fileSize: buffer.length })
    // Prefer richer parse if same subject appears twice
    const slug = slugifySubject(json.subject)
    const prev = out.get(slug)
    if (prev && (prev.units?.length || 0) >= (json.units?.length || 0)) {
      console.warn(`Keeping existing richer parse for ${slug}; skipping weaker ${entry}`)
      continue
    }
    out.set(slug, json)
  }

  return out
}

export async function exportCurriculaAsJSON(
  curricula: Map<string, CurriculumJSON> | CurriculumJSON[],
  outputDir: string,
  options?: { overwrite?: boolean }
): Promise<string[]> {
  const abs = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir)
  fs.mkdirSync(abs, { recursive: true })
  const overwrite = options?.overwrite !== false

  const list: CurriculumJSON[] = Array.isArray(curricula)
    ? curricula
    : Array.from(curricula.values())

  const written: string[] = []
  for (const curriculum of list) {
    const slug = slugifySubject(curriculum.subject)
    const filename = `${slug}-form1-4.json`
    const full = path.join(abs, filename)
    if (!overwrite && fs.existsSync(full)) {
      try {
        const existing = JSON.parse(fs.readFileSync(full, 'utf8')) as CurriculumJSON & {
          metadata?: { curated?: boolean }
        }
        if (
          existing?.metadata?.curated ||
          (existing.units || []).length > (curriculum.units || []).length
        ) {
          console.warn(`Skipping ${filename} (existing curated/richer file)`)
          continue
        }
      } catch {
        // fall through and write
      }
    }
    if (!isValidCurriculumSubject(curriculum.subject)) {
      console.warn(`Skipping write of ${filename}: invalid subject "${curriculum.subject}"`)
      continue
    }
    fs.writeFileSync(full, JSON.stringify(curriculum, null, 2), 'utf8')
    written.push(full)
  }
  return written
}
