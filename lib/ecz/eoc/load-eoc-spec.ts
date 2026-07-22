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
 * Known subject slug → filename (without .json).
 * Extend as more assessment-scheme extracts are added.
 */
const SPEC_FILES = {
  'mathematics-i': 'mathematics-i-2021',
  mathematics: 'mathematics-i-2021',
  '2021': 'mathematics-i-2021',
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
 * @param {string} subjectOrCode e.g. "Mathematics", "mathematics-i", "2021"
 * @returns {EczSubjectSpecT | null}
 */
export function loadEocSpec(subjectOrCode) {
  const key = normalizeKey(subjectOrCode)
  if (!key) return null
  if (specCache.has(key)) return specCache.get(key)

  const fileBase = SPEC_FILES[key] || (key.endsWith('-2021') ? key : `${key}-2021`)
  const filePath = path.join(DATA_DIR, `${fileBase}.json`)
  if (!fs.existsSync(filePath)) {
    // Also try exact filename if caller passed a slug that already matches.
    const alt = path.join(DATA_DIR, `${key}.json`)
    if (!fs.existsSync(alt)) return null
    return cacheParsed(key, alt)
  }
  return cacheParsed(key, filePath)
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
