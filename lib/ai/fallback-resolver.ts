/**
 * Static teaching-module fallback resolver over data/static-fallback/.
 *
 * Coverage honesty: directories exist only for forms that were ingested from
 * real teaching-module PDFs. Missing form dirs (typically Form 3–4, and any
 * Form 2 subject not yet sourced) are expected known-gaps (not anomaly alerts).
 * Topic misses on an ingested form are real warnings.
 *
 * Matching tiers (then null):
 *   Tier A — exact topic-slug directory match
 *   Tier B — normalized / alias subject + fuzzy topic token overlap
 *   Tier C — any topic under the subject/form-N tree (best keyword score)
 */

import fs from 'fs'
import path from 'path'
import { slugifySubject } from '@/lib/curriculum/jsonCurriculumLoader'
import { normalizeForm } from '@/lib/curriculum/chemistry-cdc-2024'
import { captureInfo, captureWarning } from '@/lib/utils/logger'

const FALLBACK_ROOT = path.join(process.cwd(), 'data', 'static-fallback')

/** Subjects we have teaching-module PDFs for (updated by ingest manifest). */
let ingestedSubjects: Set<string> | null = null

function loadIngestedSubjects(): Set<string> {
  if (ingestedSubjects) return ingestedSubjects
  const set = new Set<string>()
  const manifestPath = path.join(FALLBACK_ROOT, '_manifest.json')
  try {
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      for (const m of manifest.modules || []) {
        if (m.subject) set.add(slugifySubject(m.subject))
        if (m.language) set.add(String(m.language))
        if (m.out) {
          const parts = String(m.out).split(/[\\/]/)
          const idx = parts.findIndex((p) => p === 'static-fallback')
          const slug = parts[idx >= 0 ? idx + 1 : 0]
          if (slug && slug !== '_manifest.json') set.add(slug)
        }
      }
    }
  } catch {
    /* ignore */
  }
  // Also scan top-level dirs
  try {
    if (fs.existsSync(FALLBACK_ROOT)) {
      for (const ent of fs.readdirSync(FALLBACK_ROOT, { withFileTypes: true })) {
        if (ent.isDirectory() && !ent.name.startsWith('_')) set.add(ent.name)
      }
    }
  } catch {
    /* ignore */
  }
  ingestedSubjects = set
  return set
}

/** @internal test helper */
export function __resetFallbackResolverCache() {
  ingestedSubjects = null
}

const SUBJECT_ALIASES: Record<string, string> = {
  accounts: 'commerce',
  'principles-of-accounts': 'commerce',
  'musical-arts': 'music',
  'musical-arts-education': 'music',
  ict: 'computer-studies',
  'computer-studies': 'computer-studies',
  bemba: 'icibemba',
  'home-economics': 'food-and-nutrition',
}

function normalizeTopicSlug(topic: string): string {
  return String(topic || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function topicTokens(topic: string): string[] {
  return normalizeTopicSlug(topic)
    .split('-')
    .filter((t) => t.length > 2)
}

/**
 * Candidate roots for a subject/form (subject/form-N, or language/.../form-N).
 * Only returns paths that already exist — never invents empty form dirs.
 */
function candidateFormRoots(subjectSlug: string, form: number): string[] {
  const formDir = `form-${form}`
  const slugs = [subjectSlug]
  // Principles of Accounts modules may land under accounts/
  if (subjectSlug === 'commerce') slugs.push('accounts')
  if (subjectSlug === 'accounts') slugs.push('commerce')

  const roots: string[] = []
  for (const slug of slugs) {
    const direct = path.join(FALLBACK_ROOT, slug, formDir)
    if (fs.existsSync(direct)) roots.push(direct)

    const langBase = path.join(FALLBACK_ROOT, slug)
    for (const kind of ['language', 'literature']) {
      const p = path.join(langBase, kind, formDir)
      if (fs.existsSync(p)) roots.push(p)
    }
  }
  return roots
}

function listTopicDirs(formRoot: string): string[] {
  if (!fs.existsSync(formRoot)) return []
  return fs
    .readdirSync(formRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
}

function readLesson(topicDir: string): Record<string, unknown> | null {
  const lessonPath = path.join(topicDir, 'lesson-plan.json')
  if (!fs.existsSync(lessonPath)) return null
  try {
    return JSON.parse(fs.readFileSync(lessonPath, 'utf8'))
  } catch {
    return null
  }
}

function scoreTopicDir(dirName: string, tokens: string[]): number {
  if (!tokens.length) return 0
  const hay = dirName.toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (hay === t) score += 5
    else if (hay.includes(t)) score += 2
  }
  return score
}

export type FallbackHit = {
  tier: 'A' | 'B' | 'C'
  subjectSlug: string
  form: number
  topicSlug: string
  path: string
  data: Record<string, unknown>
}

export type FallbackMiss = {
  hit: null
  reason: 'known-gap' | 'form1-miss' | 'no-bank' | 'no-subject'
  form: number | null
  subjectSlug: string
}

/**
 * Resolve a static teaching-module fallback for subject/form/topic.
 * Returns a hit or null. On misses: known-gap → non-alerting captureInfo;
 * form1-miss / unavailable → captureWarning (actionable).
 */
export function resolveStaticFallback(
  subject: string | null | undefined,
  formOrGrade: string | number | null | undefined,
  topic?: string | null
): FallbackHit | null {
  const raw = String(subject || '').trim()
  if (!raw) return null

  let subjectSlug = slugifySubject(raw)
  subjectSlug = SUBJECT_ALIASES[subjectSlug] || subjectSlug
  const form = normalizeForm(formOrGrade) || 1

  if (!fs.existsSync(FALLBACK_ROOT)) {
    emitMiss({ hit: null, reason: 'no-bank', form, subjectSlug }, topic)
    return null
  }

  const roots = candidateFormRoots(subjectSlug, form)
  if (!roots.length) {
    // No form-N directory for this subject: Form 2–4 without sources = known-gap;
    // Form 1 without subject bank = no-subject / form1-miss distinction below.
    if (form >= 2) {
      emitMiss({ hit: null, reason: 'known-gap', form, subjectSlug }, topic)
      return null
    }
    const ingested = loadIngestedSubjects()
    emitMiss(
      {
        hit: null,
        reason: ingested.has(subjectSlug) ? 'form1-miss' : 'no-subject',
        form,
        subjectSlug,
      },
      topic
    )
    return null
  }

  const want = normalizeTopicSlug(topic || '')
  const tokens = topicTokens(topic || '')

  // Tier A — exact topic-slug match
  if (want) {
    for (const root of roots) {
      const topicDir = path.join(root, want)
      const data = readLesson(topicDir)
      if (data) {
        return {
          tier: 'A',
          subjectSlug,
          form,
          topicSlug: want,
          path: topicDir,
          data,
        }
      }
    }
  }

  // Tier B — fuzzy token overlap on topic directory names
  let bestB: { score: number; dir: string; root: string } | null = null
  if (tokens.length) {
    for (const root of roots) {
      for (const dir of listTopicDirs(root)) {
        const score = scoreTopicDir(dir, tokens)
        if (score > 0 && (!bestB || score > bestB.score)) {
          bestB = { score, dir, root }
        }
      }
    }
  }
  if (bestB && bestB.score >= 2) {
    const topicDir = path.join(bestB.root, bestB.dir)
    const data = readLesson(topicDir)
    if (data) {
      return {
        tier: 'B',
        subjectSlug,
        form,
        topicSlug: bestB.dir,
        path: topicDir,
        data,
      }
    }
  }

  // Tier C — first available topic under form-N (subject-level fallback)
  for (const root of roots) {
    const dirs = listTopicDirs(root)
    if (!dirs.length) continue
    // Prefer highest token score, else first
    let pick = dirs[0]
    let pickScore = -1
    for (const dir of dirs) {
      const score = tokens.length ? scoreTopicDir(dir, tokens) : 0
      if (score > pickScore) {
        pickScore = score
        pick = dir
      }
    }
    const topicDir = path.join(root, pick)
    const data = readLesson(topicDir)
    if (data) {
      return {
        tier: 'C',
        subjectSlug,
        form,
        topicSlug: pick,
        path: topicDir,
        data,
      }
    }
  }

  // Form dir exists but no usable lesson — real miss (not known-gap).
  emitMiss({ hit: null, reason: 'form1-miss', form, subjectSlug }, topic)
  return null
}

function emitMiss(miss: FallbackMiss, topic?: string | null) {
  if (miss.reason === 'known-gap') {
    // Expected until Form 3–4 (and some Form 2) teaching-module PDFs are ingested.
    // Must NOT use captureWarning / Sentry warning — that pages recently-active members.
    // Track via info log + breadcrumb only (see captureInfo).
    captureInfo('ai.fallback.known_gap', {
      kind: 'known-gap',
      subject: miss.subjectSlug,
      form: miss.form,
      topic: topic || null,
      coverage: 'missing-form-dir',
    })
    return
  }
  if (miss.reason === 'form1-miss') {
    // Real warning — we have modules for this form but topic resolution failed.
    captureWarning('ai.fallback.form1_miss', {
      kind: 'form1-miss',
      subject: miss.subjectSlug,
      form: miss.form,
      topic: topic || null,
    })
    return
  }
  if (miss.reason === 'no-subject' || miss.reason === 'no-bank') {
    captureWarning('ai.fallback.unavailable', {
      kind: miss.reason,
      subject: miss.subjectSlug,
      form: miss.form,
      topic: topic || null,
    })
  }
}

/**
 * Build a short prompt block from a fallback hit (optional AI grounding aid).
 */
export function buildFallbackContextBlock(hit: FallbackHit | null): string {
  if (!hit?.data) return ''
  const lesson = (hit.data.lesson || hit.data) as Record<string, unknown>
  const title = String(lesson.title || hit.topicSlug || '').trim()
  const lines = [
    `Teaching-module fallback (Form ${hit.form}; tier ${hit.tier}) — ${hit.subjectSlug} / ${title}`,
    'Cite as [TM N] when used. Only forms present under data/static-fallback/ are covered.',
  ]
  const topics = Array.isArray(lesson.topics) ? lesson.topics.map(String).filter(Boolean) : []
  if (topics.length) lines.push(`Topics: ${topics.join('; ')}`)
  const activities = Array.isArray(lesson.activities)
    ? lesson.activities.map(String).filter(Boolean)
    : []
  if (activities.length) {
    lines.push('Activities:')
    for (const a of activities.slice(0, 8)) lines.push(`- ${a}`)
  }
  const notes = String(lesson.notes || '').trim()
  if (notes) lines.push(notes.slice(0, 800))
  return lines.join('\n')
}
