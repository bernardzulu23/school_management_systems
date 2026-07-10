/**
 * Load ingested teaching modules from data/teaching-modules/{subject}/formN-termT.json
 */

import fs from 'fs'
import path from 'path'
import type {
  TeachingModuleJSON,
  TeachingModuleLesson,
} from '@/lib/curriculum/teachingModuleParser'

function slugify(subject: string): string {
  return String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseForm(gradeOrForm: string): number | null {
  const m = String(gradeOrForm || '').match(/\b(?:Form|Grade)?\s*([1-6])\b/i)
  return m ? Number(m[1]) : null
}

function parseTerm(term: string | number): number | null {
  if (typeof term === 'number') return term >= 1 && term <= 3 ? term : null
  const m = String(term || '').match(/\b([1-3])\b/)
  return m ? Number(m[1]) : null
}

export function loadTeachingModule(options: {
  subject: string
  gradeOrForm?: string
  term?: string | number
}): TeachingModuleJSON | null {
  const subjectSlug = slugify(options.subject)
  const root = path.join(process.cwd(), 'data', 'teaching-modules', subjectSlug)
  if (!fs.existsSync(root)) return null

  const form = parseForm(options.gradeOrForm || '')
  const term = parseTerm(options.term ?? '')

  const candidates: string[] = []
  try {
    for (const entry of fs.readdirSync(root)) {
      if (!entry.endsWith('.json')) continue
      candidates.push(path.join(root, entry))
    }
  } catch {
    return null
  }

  if (!candidates.length) return null

  const scored = candidates.map((filePath) => {
    const name = path.basename(filePath)
    const f = name.match(/form(\d+|unknown)/i)?.[1]
    const t = name.match(/term(\d+|unknown)/i)?.[1]
    let score = 0
    if (form != null && f === String(form)) score += 2
    if (term != null && t === String(term)) score += 2
    if (f === 'unknown') score -= 1
    if (t === 'unknown') score -= 1
    return { filePath, score }
  })
  scored.sort((a, b) => b.score - a.score)

  for (const { filePath } of scored) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as TeachingModuleJSON
      if (Array.isArray(data.lessons) && data.lessons.length) return data
    } catch {
      continue
    }
  }
  return null
}

function tokenize(s: string): Set<string> {
  return new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
}

function similarity(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter++
  return inter / Math.max(ta.size, tb.size)
}

/**
 * Find the best teaching-module lesson for a scheme week topic.
 */
export function matchLessonToTopic(
  lessons: TeachingModuleLesson[],
  topic: string
): TeachingModuleLesson | null {
  if (!lessons?.length || !topic) return null
  let best: TeachingModuleLesson | null = null
  let bestScore = 0
  for (const lesson of lessons) {
    const hay = [lesson.title, ...(lesson.topics || [])].join(' ')
    const score = Math.max(similarity(topic, lesson.title), similarity(topic, hay) * 0.9)
    if (score > bestScore) {
      bestScore = score
      best = lesson
    }
  }
  return bestScore >= 0.15 ? best : null
}

export function enrichActivitiesFromModule(
  topic: string,
  existingActivities: string[],
  module: TeachingModuleJSON | null
): string[] {
  if (!module) return existingActivities
  const lesson = matchLessonToTopic(module.lessons, topic)
  if (!lesson?.activities?.length) {
    // Fall back to week-index-ish: first module activities
    const fallback = module.lessons.find((l) => l.activities?.length)?.activities || []
    return Array.from(new Set([...existingActivities, ...fallback.slice(0, 3)])).slice(0, 8)
  }
  return Array.from(new Set([...existingActivities, ...lesson.activities])).slice(0, 8)
}

export function enrichResourcesFromModule(
  topic: string,
  existingResources: string[],
  module: TeachingModuleJSON | null
): string[] {
  if (!module) return existingResources
  const lesson = matchLessonToTopic(module.lessons, topic)
  const extra = lesson?.resources?.length
    ? lesson.resources
    : module.lessons.find((l) => l.resources?.length)?.resources || []
  return Array.from(new Set([...existingResources, ...extra])).slice(0, 8)
}

export function formatModuleContextForPrompt(
  module: TeachingModuleJSON | null,
  topic: string
): string {
  if (!module) return ''
  const lesson = matchLessonToTopic(module.lessons, topic)
  if (!lesson) return ''
  const parts = [
    `MoE Teaching Module (${module.subject}${module.form ? ` Form ${module.form}` : ''}${
      module.term ? ` Term ${module.term}` : ''
    }):`,
    lesson.title ? `Lesson: ${lesson.title}` : '',
    lesson.activities?.length
      ? `Suggested activities:\n- ${lesson.activities.slice(0, 6).join('\n- ')}`
      : '',
    lesson.resources?.length ? `Resources:\n- ${lesson.resources.slice(0, 5).join('\n- ')}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}
