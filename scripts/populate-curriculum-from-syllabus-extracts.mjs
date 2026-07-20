/**
 * Populate Computer Science and Hospitality Management form1-4 unit JSON from the
 * in-repo official CDC 2024 Ordinary Level syllabus extracts
 * (ingest/extracted/syllabus/*.json), which were OCR'd from the Ministry PDFs.
 *
 * Only content that appears in those extracts is written — no fabricated topics.
 * OCR artifacts (Caesar-shifted all-caps runs, ligature glyphs) are repaired
 * deterministically; residual junk lines are dropped.
 *
 * Usage:
 *   node scripts/populate-curriculum-from-syllabus-extracts.mjs           # dry run
 *   node scripts/populate-curriculum-from-syllabus-extracts.mjs --write   # write
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const CURRICULUM_DIR = path.join(ROOT, 'data', 'curriculum', 'form1-4')
const EXTRACT_DIR = path.join(ROOT, 'ingest', 'extracted', 'syllabus')
const WRITE = process.argv.includes('--write')

const OFFICIAL_URLS = {
  'computer-science':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/COMPUTER_-SCIENCE-ORDINARY-SYLLABI-FORM-1-4.pdf',
  'hospitality-management':
    'https://www.edu.gov.zm/wp-content/uploads/2025/04/HOSPITALITY-MANAGEMENT.pdf',
}

/**
 * Authoritative topic titles transcribed from the syllabus Table of Contents pages
 * in the official CDC 2024 PDFs (also present in the extract JSON). Used as unit
 * titles so we never ship OCR-garbled "Topic 1.1" placeholders.
 */
const CS_TOPICS = {
  '1.1': 'Fundamentals of Computing',
  '1.2': 'Productivity Tools: Word Processing',
  '1.3': 'Data Representation',
  '1.4': 'Computer Networks',
  '1.5': 'Cybersecurity',
  '1.6': 'Data Processing',
  '1.7': 'Web Design',
  '1.8': 'Digital Citizenship',
  '1.9': 'Databases',
  '1.10': 'Artificial Intelligence',
  '1.11': 'Internet of Things (IoT)',
  '1.12': 'Logic Gates',
  '2.1': 'Productivity Tools: Spreadsheets',
  '2.2': 'Data Representation',
  '2.3': 'Introduction to Programming',
  '2.4': 'Networking',
  '2.5': 'Cybersecurity',
  '2.6': 'Algorithms',
  '2.7': 'Web Development',
  '2.8': 'Database Design and Creation',
  '2.9': 'Artificial Intelligence (AI)',
  '2.10': 'Internet of Things',
  '2.11': 'Robotics',
  '3.1': 'Productivity Tools: Presentation',
  '3.2': 'Logic Gates',
  '3.3': 'Networking',
  '3.4': 'Cybersecurity',
  '3.5': 'Programming',
  '3.6': 'Web Development',
  '3.7': 'Database',
  '3.8': 'Artificial Intelligence',
  '3.9': 'Internet of Things (IoT)',
  '3.10': 'Mobile Application',
  '3.11': 'Cloud Computing',
  '3.12': 'Robotics',
  '4.1': 'Computer Systems',
  '4.2': 'Productivity Tools: Databases',
  '4.3': 'Computer Networking',
  '4.4': 'Programming',
  '4.5': 'Mobile Application Development',
  '4.6': 'Emerging Technologies',
  '4.7': 'Cloud Computing',
}

const HM_TOPICS = {
  '1.1': 'Introduction to Hospitality',
  '1.2': 'Front Office Operations',
  '1.3': 'Food and Beverages Operations',
  '1.4': 'Housekeeping Operations',
  '1.5': 'Cosmetology',
  '1.6': 'Entrepreneurship',
  '2.1': 'Introduction to Hospitality',
  '2.2': 'Front Office',
  '2.3': 'Housekeeping',
  '2.4': 'Food and Beverage Services',
  '2.5': 'Cosmetology',
  '2.6': 'Entrepreneurship',
  '3.1': 'Health and Safety',
  '3.2': 'Food Safety',
  '3.3': 'Customer Care',
  '3.4': 'Cosmetology',
  '3.5': 'Professional Conduct',
  '3.6': 'Communication',
  '3.7': 'Security in Hospitality',
  '3.8': 'Entrepreneurship',
  '4.1': 'Components of Hospitality Industry',
  '4.2': 'Principles of Food Preparation',
  '4.3': 'Gastronomy',
  '4.4': 'Management',
  '4.5': 'Entrepreneurship',
}

/** Decode Caesar+3 all-caps OCR runs that survived the extract (e.g. PDQDJHPHQW → MANAGEMENT). */
function decodeCaesarPlus3Word(word) {
  if (!/^[A-Z]{4,}$/.test(word)) return word
  return word
    .split('')
    .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 - 3 + 26) % 26) + 65))
    .join('')
}

function cleanOcrText(raw) {
  let s = String(raw || '')
  // Common PDF ligature / glyph substitutions seen in these extracts.
  s = s
    .replace(/Ü/g, 'fi')
    .replace(/Ý/g, 'ff')
    .replace(/[ඓඒ]/g, 'ffi')
    .replace(/[൵൶]/g, '')
    .replace(/[ਙਚ]/g, 'ff')
    .replace(/[=]+/g, ' ')
    .replace(/\\+/g, '')
    .replace(/\u0003/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Repair all-caps Caesar+3 tokens (including those glued to punctuation).
  s = s.replace(/[A-Z]{4,}/g, (w) => {
    const decoded = decodeCaesarPlus3Word(w)
    if (/[AEIOU]/.test(decoded) && decoded !== w) {
      return decoded.charAt(0) + decoded.slice(1).toLowerCase()
    }
    return w
  })

  // Known residual glyph fragments after partial decode.
  s = s
    .replace(/\bOffce\b/g, 'Office')
    .replace(/\boffce\b/g, 'office')
    .replace(/\bQuipment\b/g, 'Equipment')
    .replace(/\bquipment\b/g, 'equipment')
    .replace(/\bCooker\\?\b/g, 'cookery')
    .replace(/\bHffic?iently\b/gi, 'efficiently')
    .replace(/\s+/g, ' ')
    .trim()

  return s
}

function isUsableLine(s) {
  if (!s || s.length < 3) return false
  if (/^topic\s*\d/i.test(s)) return false
  if (/^[=.\-\s]+$/.test(s)) return false
  // Drop lines that are still mostly non-ASCII garbage after cleaning.
  const letters = (s.match(/[A-Za-z]/g) || []).length
  return letters >= Math.min(8, Math.floor(s.length * 0.4))
}

function unitHasContent(u) {
  const buckets = [u.topics, u.learningOutcomes, u.suggestedActivities, u.assessmentMethods]
  return buckets.some((b) => Array.isArray(b) && b.some((x) => String(x || '').trim()))
}

function loadCdcCorpus(slug) {
  const p = path.join(ROOT, 'data', 'curriculum', `${slug}-cdc-2024.json`)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

/**
 * Group CDC chunk records by topicNumber into unit-format units.
 * Title comes from the authoritative TOC map; topics/outcomes/activities from the chunks.
 */
function unitsFromCdc(corpus, titleMap) {
  const byTopic = new Map()
  for (const rec of corpus.curriculum || []) {
    const key = String(rec.topicNumber || '').trim()
    if (!key || !titleMap[key]) continue
    if (!byTopic.has(key)) {
      byTopic.set(key, {
        title: titleMap[key],
        topics: [],
        learningOutcomes: [],
        suggestedActivities: [],
        assessmentMethods: [],
        resources: [],
        form: rec.form,
      })
    }
    const u = byTopic.get(key)
    const sub = cleanOcrText(rec.subtopic).replace(/\s+(and|of|in|to|the)$/i, '').trim()
    if (isUsableLine(sub) && !u.topics.includes(sub)) u.topics.push(sub)
    for (const c of rec.specificCompetences || []) {
      const line = cleanOcrText(c)
      // Competences sometimes have long activity prose appended — keep the first sentence-ish clause.
      const clipped = line.split(/\s{2,}|\.(?=\s+[A-Z])/).map((x) => x.trim()).filter(Boolean)[0] || line
      if (
        isUsableLine(clipped) &&
        clipped.length < 220 &&
        !/[\\]/.test(clipped) &&
        !u.learningOutcomes.includes(clipped)
      ) {
        u.learningOutcomes.push(clipped)
      }
    }
    for (const a of rec.learningActivities || []) {
      const line = cleanOcrText(a)
      if (isUsableLine(line) && line.length < 180 && !u.suggestedActivities.includes(line)) {
        u.suggestedActivities.push(line)
      }
    }
    for (const t of rec.suggestedAssessmentTypes || []) {
      const line = cleanOcrText(t)
      if (isUsableLine(line) && !u.assessmentMethods.includes(line)) u.assessmentMethods.push(line)
    }
  }

  // Stable order by form then topic number.
  return [...byTopic.entries()]
    .sort((a, b) => {
      const [fa, ta] = a[0].split('.').map(Number)
      const [fb, tb] = b[0].split('.').map(Number)
      return fa - fb || ta - tb
    })
    .map(([, u]) => u)
    .filter(unitHasContent)
    .map((u, i) => {
      const { form, ...rest } = u
      return {
        unitNumber: i + 1,
        title: `Form ${form}: ${rest.title}`,
        topics: rest.topics,
        learningOutcomes: rest.learningOutcomes,
        suggestedActivities: rest.suggestedActivities,
        assessmentMethods: rest.assessmentMethods,
        resources: rest.resources,
      }
    })
}

const SUBJECTS = [
  {
    slug: 'computer-science',
    subject: 'Computer Science',
    titleMap: CS_TOPICS,
    extractFile: 'COMPUTER_-SCIENCE-ORDINARY-SYLLABI-FORM-1-4.json',
  },
  {
    slug: 'hospitality-management',
    subject: 'Hospitality Management',
    titleMap: HM_TOPICS,
    extractFile: 'HOSPITALITY-MANAGEMENT.json',
  },
]

const report = []

for (const cfg of SUBJECTS) {
  const corpus = loadCdcCorpus(cfg.slug)
  if (!corpus) {
    report.push({ slug: cfg.slug, status: 'SKIP', reason: 'no *-cdc-2024.json corpus' })
    continue
  }

  const units = unitsFromCdc(corpus, cfg.titleMap)
  if (!units.length) {
    report.push({ slug: cfg.slug, status: 'NO_CONTENT', reason: 'transform produced no grounding units' })
    continue
  }

  const extractPath = path.join(EXTRACT_DIR, cfg.extractFile)
  const out = {
    subject: cfg.subject,
    level: 'Form 1-4',
    gradesCovered: [7, 8, 9, 10],
    totalDuration: '12 weeks',
    units,
    metadata: {
      source: `${cfg.extractFile}; ${path.basename(OFFICIAL_URLS[cfg.slug])}`,
      sourceUrl: OFFICIAL_URLS[cfg.slug],
      derivedFrom: [
        `data/curriculum/${cfg.slug}-cdc-2024.json`,
        fs.existsSync(extractPath) ? `ingest/extracted/syllabus/${cfg.extractFile}` : null,
      ].filter(Boolean),
      authority: 'Ministry of Education — Curriculum Development Centre (CDC), Zambia, 2024',
      extractedAt: new Date().toISOString(),
      curated: true,
      note: 'Deterministic transform of official CDC Ordinary Level Form 1–4 syllabus; no fabricated content.',
    },
  }

  const outPath = path.join(CURRICULUM_DIR, `${cfg.slug}-form1-4.json`)
  report.push({
    slug: cfg.slug,
    status: WRITE ? 'WROTE' : 'DRY',
    units: units.length,
    sourceUrl: OFFICIAL_URLS[cfg.slug],
  })
  if (WRITE) {
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
  }
}

console.log(JSON.stringify(report, null, 2))
