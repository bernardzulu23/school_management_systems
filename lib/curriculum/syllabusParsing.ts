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

/** Known CBC / ECZ secondary subjects (Form 1–4). */
export const KNOWN_CBC_SUBJECTS = [
  'Chemistry',
  'Physics',
  'Biology',
  'Mathematics',
  'English',
  'Literature in English',
  'History',
  'Geography',
  'Civic Education',
  'Computer Studies',
  'Computer Science',
  'Information and Communications Technology',
  'Agricultural Science',
  'Religious Education',
  'Art and Design',
  'Music',
  'Musical Arts',
  'Food and Nutrition',
  'Home Economics',
  'Fashion and Fabrics',
  'Travel and Tourism',
  'Design and Technology',
  'Business Studies',
  'Commerce',
  'Accounts',
  'Principles of Accounts',
  'French',
  'Physical Education',
  'Hospitality Management',
  'Zambian Languages',
  'Icibemba',
  'Cinyanja',
  'Chitonga',
  'Silozi',
  'Kikaonde',
  'Lunda',
  'Luvale',
] as const

const SUBJECT_ALIASES: Record<string, string> = {
  english: 'English',
  'english language': 'English',
  literature: 'Literature in English',
  'literature in english': 'Literature in English',
  'lit in english': 'Literature in English',
  ict: 'Computer Studies',
  'computer studies': 'Computer Studies',
  'computer science': 'Computer Science',
  'information and communications technology': 'Computer Studies',
  'form ict': 'Computer Studies',
  re: 'Religious Education',
  'religious education': 'Religious Education',
  'art an design': 'Art and Design',
  'art & design': 'Art and Design',
  'art and design': 'Art and Design',
  'music arts': 'Musical Arts',
  'musical arts': 'Musical Arts',
  'musical arts education': 'Musical Arts',
  music: 'Music',
  'food & nutrition': 'Food and Nutrition',
  'food and nutrition': 'Food and Nutrition',
  'home economics': 'Home Economics',
  'fashion and fabrics': 'Fashion and Fabrics',
  ff: 'Fashion and Fabrics',
  'travel & tourism': 'Travel and Tourism',
  'travel and tourism': 'Travel and Tourism',
  'zambian languages': 'Zambian Languages',
  maths: 'Mathematics',
  maths2: 'Mathematics',
  'mathematics i': 'Mathematics',
  'mathematics ii': 'Mathematics',
  'mathematics 1': 'Mathematics',
  'mathematics 2': 'Mathematics',
  'agricultural science': 'Agricultural Science',
  'civic education': 'Civic Education',
  'design and technology': 'Design and Technology',
  'design and technology studies': 'Design and Technology',
  commerce: 'Commerce',
  accounts: 'Accounts',
  'principles of accounts': 'Principles of Accounts',
  'physical education': 'Physical Education',
  'physical education and sport': 'Physical Education',
  'hospitality management': 'Hospitality Management',
  icibemba: 'Icibemba',
  bemba: 'Icibemba',
  cinyanja: 'Cinyanja',
  nyanja: 'Cinyanja',
  chitonga: 'Chitonga',
  tonga: 'Chitonga',
  silozi: 'Silozi',
  lozi: 'Silozi',
  kikaonde: 'Kikaonde',
  kaonde: 'Kikaonde',
  lunda: 'Lunda',
  luvale: 'Luvale',
  'lit in icibemba': 'Icibemba',
  'literature in bemba': 'Icibemba',
  'literature in icibemba': 'Icibemba',
  'lit in cinyanja': 'Cinyanja',
  'literature in cinyanja': 'Cinyanja',
  'lit in chitonga': 'Chitonga',
  'literature in chitonga': 'Chitonga',
  'lit in silozi': 'Silozi',
  'literature in silozi': 'Silozi',
  'lit in kikaonde': 'Kikaonde',
  'literature in kikaonde': 'Kikaonde',
  'lit in lunda': 'Lunda',
  'literature in lunda': 'Lunda',
  'lit in luvale': 'Luvale',
  'literature in luvale': 'Luvale',
}

export function normalizeKnownSubject(raw: string): string | null {
  const cleaned = String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/\bsyllabus\b/gi, '')
    .replace(/\bsecondary\b/gi, '')
    .replace(/\beducation\b/gi, '')
    .replace(/\bordinary\s+level\b/gi, '')
    .replace(/\bform\s*[1-6]\b/gi, '')
    .trim()
  if (!cleaned) return null

  const lower = cleaned.toLowerCase()
  if (SUBJECT_ALIASES[lower]) return SUBJECT_ALIASES[lower]

  for (const known of KNOWN_CBC_SUBJECTS) {
    if (lower === known.toLowerCase()) return known
    if (lower.includes(known.toLowerCase()) || known.toLowerCase().includes(lower)) {
      // Prefer exact-ish matches; avoid matching short noise like "Art" inside unrelated text
      if (lower.length >= 4 || known.length <= 5) return known
    }
  }
  return null
}

export function extractSubjectFromFilename(filename: string): string | null {
  const base = String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\bsyllabus\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalizeKnownSubject(base)
}

export function extractSubject(text: string, filenameHint?: string): string {
  if (filenameHint) {
    const fromName = extractSubjectFromFilename(filenameHint)
    if (fromName) return fromName
  }

  const headerPatterns = [
    /([A-Za-z][A-Za-z\s&()/]{2,50})\s+SYLLABUS\s+SECONDARY/i,
    /(?:subject|syllabus)\s*[:\-]\s*([A-Za-z][A-Za-z\s&()/]{2,60})/i,
  ]
  for (const re of headerPatterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const known = normalizeKnownSubject(m[1])
      if (known) return known
    }
  }

  // Prefer allowlisted subject names appearing in the document
  const found: { subject: string; index: number }[] = []
  for (const known of KNOWN_CBC_SUBJECTS) {
    const re = new RegExp(`\\b${known.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const m = text.match(re)
    if (m?.index != null) found.push({ subject: known, index: m.index })
  }
  if (found.length) {
    found.sort((a, b) => a.index - b.index)
    return found[0].subject
  }

  return 'General'
}

export function isValidCurriculumSubject(subject: string): boolean {
  const s = String(subject || '').trim()
  if (!s || /^general$/i.test(s)) return false
  return Boolean(
    normalizeKnownSubject(s) || KNOWN_CBC_SUBJECTS.some((k) => k.toLowerCase() === s.toLowerCase())
  )
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

export async function parseSyllabusFromBuffer(
  buffer: Buffer,
  options?: { filenameHint?: string }
): Promise<ParsedSyllabus> {
  const raw = await extractTextFromBuffer(buffer, 'pdf')
  const text = normalizeWhitespace(raw)
  if (!text || text.length < 40) {
    throw new Error('Could not extract enough text from the PDF syllabus')
  }

  const units = extractUnits(text)
  return {
    subject: extractSubject(text, options?.filenameHint),
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
  const filenameHint = pdfUrl.split(/[\\/]/).pop()
  const parsed = await parseSyllabusFromBuffer(buffer, { filenameHint })
  return parsed
}
