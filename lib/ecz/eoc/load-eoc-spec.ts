/**
 * Load ECZ EoC assessment-scheme specs from data/curriculum/ecz-eoc/.
 * Mirrors curriculum JSON loading: sync fs read + in-memory cache.
 */
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec, type EczSubjectSpecT } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'

const DATA_DIR = path.join(process.cwd(), 'data', 'curriculum', 'ecz-eoc')

/** @type {Map<string, EczSubjectSpecT>} */
const specCache = new Map()

/**
 * Known subject slug / code → filename (without .json).
 * Extend as more assessment-scheme extracts are added from
 * Validation_folder/ECSEOL Assessment Schemes.
 */
const SPEC_FILES = {
  'mathematics-i': 'mathematics-i-2021',
  mathematics: 'mathematics-i-2021',
  '2021': 'mathematics-i-2021',
  'agricultural-science': 'agricultural-science-4018',
  agriculture: 'agricultural-science-4018',
  '4018': 'agricultural-science-4018',
  physics: 'physics-4016',
  '4016': 'physics-4016',
  chemistry: 'chemistry-4014',
  '4014': 'chemistry-4014',
  biology: 'biology-4012',
  '4012': 'biology-4012',
  geography: 'geography-3014',
  '3014': 'geography-3014',
}

function normalizeKey(subjectOrCode) {
  return String(subjectOrCode || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Resolve and parse an EoC subject spec by subject name, slug, or subjectCode.
 * @param {string} subjectOrCode e.g. "Mathematics", "mathematics-i", "2021", "4018"
 * @returns {EczSubjectSpecT | null}
 */
export function loadEocSpec(subjectOrCode) {
  const key = normalizeKey(subjectOrCode)
  if (!key) return null
  if (specCache.has(key)) return specCache.get(key)

  const candidates = [
    SPEC_FILES[key],
    key,
    // Common filename suffixes used in this corpus
    key.endsWith('-2021') ? null : `${key}-2021`,
    key.endsWith('-2024') ? null : `${key}-2024`,
    key.endsWith('-2025') ? null : `${key}-2025`,
    key.endsWith('-4018') ? null : `${key}-4018`,
    key.endsWith('-4016') ? null : `${key}-4016`,
    key.endsWith('-4014') ? null : `${key}-4014`,
    key.endsWith('-4012') ? null : `${key}-4012`,
    key.endsWith('-3014') ? null : `${key}-3014`,
  ].filter(Boolean)

  for (const fileBase of candidates) {
    const filePath = path.join(DATA_DIR, `${fileBase}.json`)
    if (fs.existsSync(filePath)) return cacheParsed(key, filePath)
  }

  // Last resort: scan directory for a filename containing the slug/code.
  if (fs.existsSync(DATA_DIR)) {
    const match = fs
      .readdirSync(DATA_DIR)
      .find((f) => f.toLowerCase().endsWith('.json') && f.toLowerCase().includes(key))
    if (match) return cacheParsed(key, path.join(DATA_DIR, match))
  }

  return null
}

function cacheParsed(key, filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const parsed = EczSubjectSpec.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Invalid EoC spec at ${filePath}: ${parsed.error.message}`)
  }
  specCache.set(key, parsed.data)
  // Also cache by subjectCode / subjectName for subsequent lookups.
  specCache.set(normalizeKey(parsed.data.subjectCode), parsed.data)
  specCache.set(normalizeKey(parsed.data.subjectName), parsed.data)
  return parsed.data
}

/** Absolute directory for EoC JSON specs (tests / docs). */
export function getEocSpecDataDir() {
  return DATA_DIR
}

/** Reset in-memory cache (test helper). */
export function __clearEocSpecCache() {
  specCache.clear()
}
