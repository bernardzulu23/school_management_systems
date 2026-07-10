/**
 * Parse syllabus PDF text into structured units for Curriculum storage.
 * Uses existing pdf-parse via lib/rag/parse.js — not a separate Pdf2Data API.
 */

import { extractTextFromBuffer } from '@/lib/rag/parse'

export type ParsedSyllabusUnit = {
  title: string
  topics: string[]
  outcomes: string[]
  activities: string[]
  assessment: string[]
  resources: string[]
  durationMinutes?: number
  weekHint?: number
  sortOrder: number
}

export type ParsedSyllabus = {
  subject: string
  grade: string
  units: ParsedSyllabusUnit[]
  learningOutcomes: string[]
  suggestedActivities: string[]
  rawTextLength: number
}

function normalizeWhitespace(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function extractSubject(text: string): string {
  const patterns = [
    /(?:subject|syllabus)\s*[:\-]\s*([A-Za-z][A-Za-z\s&()/]{2,60})/i,
    /\b(Chemistry|Physics|Biology|Mathematics|English|History|Geography|Civic Education|Computer Studies|Agricultural Science)\b/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return 'General'
}

export function extractGrade(text: string): string {
  const form = text.match(/\bForm\s*([1-6])\b/i)
  if (form) return `Form ${form[1]}`
  const grade = text.match(/\bGrade\s*([7-9]|1[0-2])\b/i)
  if (grade) return `Grade ${grade[1]}`
  return 'Form 1'
}

function collectSectionLines(text: string, headingRe: RegExp, stopRes: RegExp[]): string[] {
  const lines = text
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
      const cleaned = line.replace(/^[\d.)\-•*]+\s*/, '').trim()
      if (cleaned.length > 3) out.push(cleaned)
    }
  }
  return out
}

export function extractOutcomes(text: string): string[] {
  return collectSectionLines(
    text,
    /learning\s+outcomes?|specific\s+competenc|expected\s+standard/i,
    [/suggested\s+activit/i, /assessment/i, /unit\s+\d+/i, /topic\s+\d+/i]
  ).slice(0, 40)
}

export function extractActivities(text: string): string[] {
  return collectSectionLines(text, /suggested\s+activit|learning\s+activit|teaching\s+activit/i, [
    /assessment/i,
    /resources?/i,
    /unit\s+\d+/i,
    /topic\s+\d+/i,
  ]).slice(0, 40)
}

/**
 * Heuristic unit extraction: look for "Unit N", "Topic N", or numbered headings.
 */
export function extractUnits(text: string): ParsedSyllabusUnit[] {
  const normalized = normalizeWhitespace(text)
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const unitStart = /^(?:unit|topic|theme|chapter)\s*(\d+[a-z]?)[:.\s\-–]+(.+)$/i

  const starts: { index: number; title: string; weekHint?: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(unitStart)
    if (m) {
      starts.push({
        index: i,
        title: m[2].trim() || `Unit ${m[1]}`,
        weekHint: Number.parseInt(m[1], 10) || undefined,
      })
    }
  }

  if (starts.length === 0) {
    // Fallback: split by blank-ish blocks of "1. Title"
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\d{1,2})[.)]\s+([A-Z].{8,80})$/)
      if (m) {
        starts.push({
          index: i,
          title: m[2].trim(),
          weekHint: Number(m[1]),
        })
      }
    }
  }

  if (starts.length === 0) {
    const outcomes = extractOutcomes(normalized)
    const activities = extractActivities(normalized)
    return [
      {
        title: 'General syllabus content',
        topics: [],
        outcomes,
        activities,
        assessment: [],
        resources: [],
        sortOrder: 0,
      },
    ]
  }

  const units: ParsedSyllabusUnit[] = []
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s]
    const end = s + 1 < starts.length ? starts[s + 1].index : lines.length
    const block = lines.slice(start.index, end).join('\n')
    const topics: string[] = []
    for (const line of lines.slice(start.index + 1, end)) {
      if (/^sub[- ]?topic|^content/i.test(line)) continue
      if (/outcome|activit|assessment|resource/i.test(line)) break
      if (line.length > 8 && line.length < 120 && !unitStart.test(line)) {
        topics.push(line.replace(/^[\d.)\-•*]+\s*/, '').trim())
      }
      if (topics.length >= 8) break
    }

    units.push({
      title: start.title,
      topics,
      outcomes: extractOutcomes(block),
      activities: extractActivities(block),
      assessment: collectSectionLines(block, /assessment/i, [
        /resource/i,
        /unit\s+\d+/i,
        /topic\s+\d+/i,
      ]).slice(0, 10),
      resources: collectSectionLines(block, /resources?/i, [
        /unit\s+\d+/i,
        /topic\s+\d+/i,
        /references?/i,
      ]).slice(0, 10),
      weekHint: start.weekHint,
      sortOrder: s,
    })
  }

  return units
}

export async function parseSyllabusFromBuffer(buffer: Buffer): Promise<ParsedSyllabus> {
  const raw = await extractTextFromBuffer(buffer, 'pdf')
  const text = normalizeWhitespace(raw)
  if (!text || text.length < 40) {
    throw new Error('Could not extract enough text from the PDF syllabus')
  }

  const units = extractUnits(text)
  return {
    subject: extractSubject(text),
    grade: extractGrade(text),
    units,
    learningOutcomes: extractOutcomes(text),
    suggestedActivities: extractActivities(text),
    rawTextLength: text.length,
  }
}

export async function parseSyllabus(pdfUrl: string): Promise<ParsedSyllabus> {
  const response = await fetch(pdfUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch syllabus PDF (${response.status})`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const parsed = await parseSyllabusFromBuffer(buffer)
  return parsed
}
