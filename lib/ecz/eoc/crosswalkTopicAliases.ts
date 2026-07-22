/**
 * Cross-walk EoC topic aliases against form1-4 / syllabus topic corpora.
 *
 * - Exact (case-insensitive) hits on unverifiedTopicAliases → promote to topicAliases
 *   when the parent EoC is resolutionMode "topic" (skill-lens EoCs keep topics unverified).
 * - Unmapped corpus topics → assigned to the best-scoring subSkill (verified if strong match).
 */
import type { EczSubjectSpec } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'

const STOP = new Set([
  'the',
  'and',
  'of',
  'in',
  'on',
  'to',
  'a',
  'an',
  'for',
  'with',
  'by',
  'or',
  'as',
  'at',
  'from',
  'into',
  'form',
  'topic',
  'subtopic',
  'unit',
  'level',
])

export function normalizeTopicKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanSyllabusTopic(raw: string): string {
  return String(raw || '')
    .replace(/^=+\s*/g, '')
    .replace(/\s*=+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Prefer the human phrase after a syllabus numbering code when present. */
export function canonicalizeCorpusTopic(raw: string): string {
  const cleaned = cleanSyllabusTopic(raw)
  const afterCode = cleaned.match(/\d+(?:\.\d+)+\.?\s+(.+)$/)
  if (afterCode) {
    const tail = cleanSyllabusTopic(afterCode[1])
    if (isUsableTopic(tail)) return tail
  }
  return cleaned
}

/** Pull usable topic-like phrases from noisy form1-4 unit titles. */
export function topicsFromUnitTitle(title: string): string[] {
  const t = cleanSyllabusTopic(title)
  if (!t) return []
  const out: string[] = []
  // "Form 1: GREETINGS ===1.2.1 Formal and Informal Greetings"
  const m = t.match(/^Form\s+\d+\s*:\s*(.+)$/i)
  const body = m ? m[1] : t
  const parts = body
    .split(/={2,}|:{2,}|\|/)
    .map((p) => p.trim())
    .filter(Boolean)
  for (const part of parts) {
    const stripped = part
      .replace(/^\d+(\.\d+)*\s*/g, '')
      .replace(/^Topic\s+\d+(\.\d+)*\s*/i, '')
      .trim()
    if (isUsableTopic(stripped)) out.push(stripped)
  }
  return out
}

const DANGLING_END = /\b(and|or|of|to|in|on|for|with|the|a|an|by|from)$/i
const GENERIC_SINGLE = new Set([
  'human',
  'traditional',
  'curriculum',
  'introduction',
  'operations',
  'natural',
  'school',
  'education',
  'unit',
  'module',
  'general',
  'others',
  'misc',
])

export function isUsableTopic(raw: string): boolean {
  const t = cleanSyllabusTopic(raw)
  if (!t) return false
  if (t.length < 4 || t.length > 100) return false
  if (/^Form\s+\d+\s*:\s*Topic\s+\d/i.test(t)) return false
  if (/^Subtopic\s+\d/i.test(t)) return false
  if (/^Topic\s+\d+(\.\d+)*$/i.test(t)) return false
  if (/^Unit\s+\d+$/i.test(t)) return false
  if (/^Introduction to$/i.test(t)) return false
  if (DANGLING_END.test(t)) return false
  // place-name / school stubs common in bad Zambian Languages OCR
  if (/^(School|Secondary School|Education)\s*[-–—]/i.test(t)) return false
  // OCR mojibake blocks (rot13-ish syllable junk)
  if (/[A-Z]{2,}\s+[a-z]{1,3}\s+[A-Z]{4,}/.test(t) && /WHQ|RI |PHDV|Ü|¶|¿|൵/.test(t)) return false
  if (/WHQGHQF|PHDVXUHV|QDWLRQ|di൵erent/i.test(t)) return false

  const letters = (t.match(/[A-Za-z]/g) || []).length
  if (letters < 4) return false
  const compact = t.replace(/\s/g, '')
  if (letters / compact.length < 0.6) return false

  const toks = normalizeTopicKey(t).split(' ').filter(Boolean)
  if (toks.length === 1 && (GENERIC_SINGLE.has(toks[0]) || toks[0].length < 6)) return false
  return true
}

function tokens(value: string): Set<string> {
  const out = new Set<string>()
  for (const tok of normalizeTopicKey(value).split(' ')) {
    if (tok.length < 3 || STOP.has(tok)) continue
    out.add(tok)
  }
  return out
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))) return true
  return false
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) {
    for (const y of b) {
      if (tokensMatch(x, y)) {
        inter += 1
        break
      }
    }
  }
  const union = a.size + b.size - inter
  return union ? inter / union : 0
}

export type CorpusIndex = {
  /** normalize → preferred display string (prefer form1-4 casing) */
  byNorm: Map<string, string>
  topics: string[]
}

export function buildCorpusIndex(topics: string[]): CorpusIndex {
  const byNorm = new Map<string, string>()
  for (const raw of topics) {
    const cleaned = canonicalizeCorpusTopic(raw)
    if (!isUsableTopic(cleaned)) continue
    const key = normalizeTopicKey(cleaned)
    if (!key || byNorm.has(key)) continue
    byNorm.set(key, cleaned)
  }
  return { byNorm, topics: Array.from(byNorm.values()) }
}

export type AliasMatch = { kind: 'exact'; corpusTopic: string } | { kind: 'none' }

export function matchAliasToCorpus(alias: string, corpus: CorpusIndex): AliasMatch {
  const key = normalizeTopicKey(alias)
  if (!key) return { kind: 'none' }
  const hit = corpus.byNorm.get(key)
  if (hit) return { kind: 'exact', corpusTopic: hit }
  return { kind: 'none' }
}

function subSkillText(eocDesc: string, label: string, aliases: string[]): string {
  return [eocDesc, label, ...aliases].join(' ')
}

/** Soft skill-lens hints for language syllabi where form1-4 topics are thematic, not EoC-named. */
const LANGUAGE_TOPIC_HINTS: Array<{ topic: RegExp; skill: RegExp; boost: number }> = [
  {
    topic:
      /\b(greet|introduc|convers|speak|oral presentation|pronunc|opinion|discuss|debate|role play)\b/i,
    skill: /\b(speak|oral|spoken|pronunc|present|express|conversation)\b/i,
    boost: 0.35,
  },
  {
    topic: /\b(listen|phonetic|sound|liaison|alphabet|dictation)\b/i,
    skill: /\b(listen|spoken|oral comprehens|interpret.*spoken)\b/i,
    boost: 0.35,
  },
  {
    topic: /\b(read|comprehens|passage|translat|summar|text)\b/i,
    skill: /\b(read|interpret|summar|translat|comprehens|continuous)\b/i,
    boost: 0.35,
  },
  {
    topic:
      /\b(grammar|structure|compos|essay|letter|spell|punctuat|orthograph|syntax|writing|cv|vitae)\b/i,
    skill: /\b(writ|grammar|convention|compos|spell|orthograph|punctuat|structure|transform)\b/i,
    boost: 0.35,
  },
]

export function scoreTopicAgainstSubSkill(
  topic: string,
  eocDescription: string,
  subSkillLabel: string,
  aliases: string[]
): number {
  const topicToks = tokens(topic)
  const skillText = subSkillText(eocDescription, subSkillLabel, aliases)
  const skillToks = tokens(skillText)
  const jac = jaccard(topicToks, skillToks)
  let covered = 0
  for (const t of topicToks) {
    let hit = false
    for (const s of skillToks) {
      if (tokensMatch(t, s)) {
        hit = true
        break
      }
    }
    if (hit) covered += 1
  }
  const coverage = topicToks.size ? covered / topicToks.size : 0
  let score = jac * 0.55 + coverage * 0.45
  for (const hint of LANGUAGE_TOPIC_HINTS) {
    if (hint.topic.test(topic) && hint.skill.test(skillText)) score += hint.boost
  }
  return Math.min(1, score)
}

export type CrosswalkChange = {
  subjectCode: string
  eocId: string
  subSkillId: string
  action: 'promote' | 'add-verified' | 'add-unverified'
  alias: string
  reason: string
}

export type CrosswalkResult = {
  spec: EczSubjectSpec
  changes: CrosswalkChange[]
}

type MutableSub = {
  id: string
  label: string
  topicAliases: string[]
  unverifiedTopicAliases: string[]
  taskTypeAliases?: string[]
  note?: string
}

/**
 * Apply cross-walk mutations to a deep-cloned spec.
 * Does not mutate the input.
 */
export function crosswalkSpec(
  input: EczSubjectSpec,
  corpusTopics: string[],
  options: { minVerifiedScore?: number; minUnverifiedScore?: number } = {}
): CrosswalkResult {
  const minVerified = options.minVerifiedScore ?? 0.48
  const minUnverified = options.minUnverifiedScore ?? 0.32
  const spec = structuredClone(input) as EczSubjectSpec
  const corpus = buildCorpusIndex(corpusTopics)
  const changes: CrosswalkChange[] = []

  const known = new Set<string>()
  for (const eoc of spec.elementsOfConstruct) {
    for (const sub of eoc.subSkills) {
      for (const a of sub.topicAliases) known.add(normalizeTopicKey(a))
      for (const a of sub.unverifiedTopicAliases ?? []) known.add(normalizeTopicKey(a))
    }
  }

  // Pass 1: promote exact unverified → verified (topic-mode only)
  for (const eoc of spec.elementsOfConstruct) {
    const mode = eoc.resolutionMode ?? 'topic'
    for (const sub of eoc.subSkills as MutableSub[]) {
      const remaining: string[] = []
      for (const alias of sub.unverifiedTopicAliases ?? []) {
        const match = matchAliasToCorpus(alias, corpus)
        if (mode === 'topic' && match.kind === 'exact') {
          const display = match.corpusTopic
          const key = normalizeTopicKey(display)
          if (!sub.topicAliases.some((a) => normalizeTopicKey(a) === key)) {
            sub.topicAliases.push(display)
            changes.push({
              subjectCode: spec.subjectCode,
              eocId: eoc.id,
              subSkillId: sub.id,
              action: 'promote',
              alias: display,
              reason: 'exact match in form1-4/ingest corpus',
            })
          }
          // drop from unverified either way
          continue
        }
        remaining.push(alias)
      }
      sub.unverifiedTopicAliases = remaining
    }
  }

  // Pass 2: assign unmapped corpus topics to best subSkill
  for (const topic of corpus.topics) {
    const key = normalizeTopicKey(topic)
    if (!key || known.has(key)) continue

    let best: {
      eocId: string
      sub: MutableSub
      mode: string
      score: number
      eocDesc: string
    } | null = null
    let second = 0

    for (const eoc of spec.elementsOfConstruct) {
      const mode = eoc.resolutionMode ?? 'topic'
      for (const sub of eoc.subSkills as MutableSub[]) {
        const aliases = [...sub.topicAliases, ...(sub.unverifiedTopicAliases ?? [])]
        const score = scoreTopicAgainstSubSkill(topic, eoc.description, sub.label, aliases)
        if (!best || score > best.score) {
          second = best?.score ?? 0
          best = { eocId: eoc.id, sub, mode, score, eocDesc: eoc.description }
        } else if (score > second) {
          second = score
        }
      }
    }

    if (!best || best.score < minUnverified) continue
    // Prefer decisive winners
    if (best.score - second < 0.06 && best.score < minVerified + 0.05) continue

    // Avoid single-token weak adds unless decisive
    const topicToks = normalizeTopicKey(topic)
      .split(' ')
      .filter((t) => t.length >= 3 && !STOP.has(t))
    if (topicToks.length < 2 && best.score < minVerified + 0.1) continue

    known.add(key)
    if (best.mode === 'taskType') {
      // skill-lens: content topics stay provisional
      best.sub.unverifiedTopicAliases = best.sub.unverifiedTopicAliases ?? []
      best.sub.unverifiedTopicAliases.push(topic)
      if (!best.sub.note) {
        best.sub.note =
          'Syllabus topic aliases are provisional content anchors; resolve via taskType for generation.'
      }
      changes.push({
        subjectCode: spec.subjectCode,
        eocId: best.eocId,
        subSkillId: best.sub.id,
        action: 'add-unverified',
        alias: topic,
        reason: `corpus assign score=${best.score.toFixed(2)} (taskType EoC)`,
      })
    } else if (best.score >= minVerified) {
      best.sub.topicAliases.push(topic)
      changes.push({
        subjectCode: spec.subjectCode,
        eocId: best.eocId,
        subSkillId: best.sub.id,
        action: 'add-verified',
        alias: topic,
        reason: `corpus assign score=${best.score.toFixed(2)}`,
      })
    } else {
      best.sub.unverifiedTopicAliases = best.sub.unverifiedTopicAliases ?? []
      best.sub.unverifiedTopicAliases.push(topic)
      changes.push({
        subjectCode: spec.subjectCode,
        eocId: best.eocId,
        subSkillId: best.sub.id,
        action: 'add-unverified',
        alias: topic,
        reason: `corpus assign score=${best.score.toFixed(2)} (weak)`,
      })
    }
  }

  // Pass 3: promote any remaining exact unverified hits (covers Pass-2 corpus adds)
  for (const eoc of spec.elementsOfConstruct) {
    const mode = eoc.resolutionMode ?? 'topic'
    if (mode !== 'topic') continue
    for (const sub of eoc.subSkills as MutableSub[]) {
      const remaining: string[] = []
      for (const alias of sub.unverifiedTopicAliases ?? []) {
        const match = matchAliasToCorpus(alias, corpus)
        if (match.kind === 'exact') {
          const display = match.corpusTopic
          const key = normalizeTopicKey(display)
          if (!sub.topicAliases.some((a) => normalizeTopicKey(a) === key)) {
            sub.topicAliases.push(display)
            changes.push({
              subjectCode: spec.subjectCode,
              eocId: eoc.id,
              subSkillId: sub.id,
              action: 'promote',
              alias: display,
              reason: 'exact match after corpus assign',
            })
          }
          continue
        }
        remaining.push(alias)
      }
      sub.unverifiedTopicAliases = remaining
    }
  }

  // Stable sort aliases for readable diffs
  for (const eoc of spec.elementsOfConstruct) {
    for (const sub of eoc.subSkills) {
      sub.topicAliases = dedupeSort(sub.topicAliases)
      sub.unverifiedTopicAliases = dedupeSort(sub.unverifiedTopicAliases ?? [])
    }
  }

  return { spec, changes }
}

function dedupeSort(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const key = normalizeTopicKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.sort((a, b) => a.localeCompare(b))
}
