/**
 * Load ECZ EoC assessment-scheme specs from data/curriculum/ecz-eoc/.
 * Subject-agnostic: auto-discovers every *.json plus registry aliases so
 * ALL syllabi share one loader path.
 */
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec, type EczSubjectSpecT } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { buildSpecFileAliasMap } from '@/lib/ecz/eoc/subjectRegistry'

const DATA_DIR = path.join(process.cwd(), 'data', 'curriculum', 'ecz-eoc')

/** @type {Map<string, EczSubjectSpecT>} */
const specCache = new Map()

let aliasMap: Record<string, string> | null = null
let discoveredFiles: string[] | null = null

function normalizeKey(subjectOrCode) {
  return String(subjectOrCode || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getAliasMap() {
  if (!aliasMap) aliasMap = buildSpecFileAliasMap()
  return aliasMap
}

function listSpecFiles() {
  if (discoveredFiles) return discoveredFiles
  if (!fs.existsSync(DATA_DIR)) {
    discoveredFiles = []
    return discoveredFiles
  }
  discoveredFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => f.replace(/\.json$/i, ''))
  return discoveredFiles
}

/**
 * Resolve and parse an EoC subject spec by subject name, slug, or subjectCode.
 * @param {string} subjectOrCode e.g. "Mathematics", "4018", "Art and Design"
 * @returns {EczSubjectSpecT | null}
 */
export function loadEocSpec(subjectOrCode) {
  const key = normalizeKey(subjectOrCode)
  if (!key) return null
  if (specCache.has(key)) return specCache.get(key)

  const aliases = getAliasMap()
  const files = listSpecFiles()
  const candidates = [
    aliases[key],
    key,
    ...files.filter((f) => f === key || f.startsWith(`${key}-`) || f.includes(key)),
  ].filter(Boolean)

  const tried = new Set()
  for (const fileBase of candidates) {
    if (tried.has(fileBase)) continue
    tried.add(fileBase)
    const filePath = path.join(DATA_DIR, `${fileBase}.json`)
    if (fs.existsSync(filePath)) return cacheParsed(key, filePath)
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
  specCache.set(normalizeKey(parsed.data.subjectCode), parsed.data)
  specCache.set(normalizeKey(parsed.data.subjectName), parsed.data)
  const base = path.basename(filePath, '.json')
  specCache.set(normalizeKey(base), parsed.data)
  return parsed.data
}

/** Load every shipped EoC spec (validates each against EczSubjectSpec). */
export function loadAllEocSpecs(): EczSubjectSpecT[] {
  const out = []
  const seen = new Set()
  for (const fileBase of listSpecFiles()) {
    const spec = loadEocSpec(fileBase)
    if (!spec) continue
    if (seen.has(spec.subjectCode)) continue
    seen.add(spec.subjectCode)
    out.push(spec)
  }
  return out
}

/** Absolute directory for EoC JSON specs (tests / docs). */
export function getEocSpecDataDir() {
  return DATA_DIR
}

/** Reset in-memory cache (test helper). */
export function __clearEocSpecCache() {
  specCache.clear()
  aliasMap = null
  discoveredFiles = null
}
